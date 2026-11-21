import subprocess
from datetime import datetime, timezone
from types import SimpleNamespace

from services.code_quality import analyze_sources
from services.git_history import GitHistory
from services.github_client import GitHubClient
from services.models import FileRecord, RepoAnalysis, StudentIdentity
from services.scoring import WeightedContributionScorer


def test_git_history_ownership_and_scoring(tmp_path):
    def git(*args):
        return subprocess.check_output(['git', '-C', str(tmp_path), *args], text=True).strip()

    def commit(name, message):
        git('add', '.')
        git('-c', 'user.name=' + name, '-c', 'user.email=' + name + '@example.test',
            '-c', 'commit.gpgsign=false', 'commit', '-qm', message)
        return git('rev-parse', 'HEAD')

    git('init', '-q', '-b', 'main')
    source = tmp_path / 'app.py'
    source.write_text('class Billing:\n    def total(self):\n        return 0\n')
    original = commit('alice', 'Initial calculation')
    git('switch', '-qc', 'feature/extra')
    (tmp_path / 'other.py').write_text('value = 1\n')
    commit('bob', 'Add branch-only work')
    git('switch', '-q', 'main')
    source.write_text(source.read_text() + '\n# documentation only\n')
    commit('bob', 'Describe this file')
    source.write_text(source.read_text().replace('return 0', 'return 1'))
    fix = commit('alice', 'Fix billing total')
    history = GitHistory(tmp_path)
    commits, fixes = history.commits(lambda sha, name, email: name)
    assert len(commits) == 4
    assert sum(c.sha == original for c in commits) == 1
    assert fixes == [{'fix_sha': fix, 'evidence': [{'sha': original, 'path': 'app.py', 'lines': [3]}]}]
    files = history.files('main')
    assert [f.path for f in files] == ['app.py']
    now = datetime.now(timezone.utc)
    when = now.isoformat()
    students = [StudentIdentity(usn=n.upper(), login=n) for n in ['alice', 'bob', 'reviewer', 'idle']]
    pulls = [{'number': 5, 'author': 'alice', 'state': 'merged', 'title': 'Billing',
              'date': when, 'closed_at': when, 'reviews': [
                  {'author': 'reviewer', 'state': 'COMMENTED', 'date': when},
                  {'author': 'reviewer', 'state': 'APPROVED', 'date': when}]}]
    issues = [{'number': 3, 'author': 'alice', 'title': 'Rounding bug', 'date': '2026-01-01T00:00:00Z',
               'closed_at': '2026-01-02T00:00:00Z', 'closer': 'reviewer', 'assignees': ['idle'],
               'state': 'closed', 'reason': 'completed', 'bug': True}]
    result = WeightedContributionScorer().score(RepoAnalysis(
        owner='demo', repo='repo', branch='main', default_branch='main', commits=commits, files=files,
        fixes=fixes, pulls=pulls, issues=issues, students=students, analyzed_at=now))
    rows = {r.usn: r for r in result.contributors}
    alice, reviewer, idle = rows['ALICE'], rows['REVIEWER'], rows['IDLE']
    assert alice.files_created == ['app.py']
    assert alice.bug_events[0]['candidates'][0]['author'] == 'alice'
    assert any(o['kind'] == 'class' and o['name'] == 'Billing' and o['primary'] for o in alice.ownership)
    assert alice.merged == 1 and reviewer.approvals == 1 and reviewer.reviews == 2
    assert reviewer.commits == 0 and reviewer.status == 'ACTIVE'
    assert reviewer.score_parts['reviews'] == 7.5  # Two submissions on one PR
    assert reviewer.bugs_resolved == 1 and reviewer.mean_resolution_hours == 24
    assert idle.status == 'NOT_CONTRIBUTING' and idle.score == 0 and idle.active_days == 0
    assert len(idle.issue_history) == 1 and idle.inactive_days > 0
    assert sum(r.code_share for r in rows.values()) == 100


def test_java_javascript_quality_and_symbols():
    body = 'class Pay {\n  private int unused() {\n' + '    if (a) { return 1; }\n' * 11 + '    return 0;\n  }\n}\n'
    js = 'export class Client {\n  run() { return true; }\n}\nconst helper = () => 0;\n'
    files = [FileRecord(path='Pay.java', content=body, blame=[(1, 16, 's')]),
             FileRecord(path='client.ts', content=js, blame=[(1, 4, 's')])]
    owners, quality = analyze_sources(files, {'s': 'sam'})
    assert {'Pay', 'unused', 'Client', 'run', 'helper'} <= {s['name'] for s in owners['sam']}
    kinds = {f['kind'] for q in quality for f in q['findings']}
    assert {'Complex function', 'Possibly unused'} <= kinds
    assert all(0 <= q['maintainability'] <= 100 for q in quality)
    repeated = '\n'.join(f'v{i} = {i}' for i in range(8))
    _, reports = analyze_sources([FileRecord(path=p, content=repeated) for p in ['a.py','b.py']], {})
    assert any(f['kind'] == 'Duplicate block' for f in reports[1]['findings'])


def test_collaboration_skips_pr_issue_and_uses_actual_closer():
    when = datetime.now(timezone.utc)
    actor = SimpleNamespace(login='actual-closer')
    issue = SimpleNamespace(number=3, pull_request=None, state='closed', title='Bug', user=actor,
                            created_at=when, closed_at=when, closed_by=actor, assignees=[],
                            labels=[SimpleNamespace(name='bug')], raw_data={'state_reason': 'completed'})
    pr = SimpleNamespace(number=5, title='Unmerged', user=actor, state='closed', created_at=when,
                         closed_at=when, merged_at=None, get_reviews=lambda: [])
    repo = SimpleNamespace(has_issues=True, get_pulls=lambda state: iter([pr]),
                           get_issues=lambda state: iter([SimpleNamespace(number=5, raw_data={'pull_request': {'url': 'pr'}}), issue]),
                           get_issue=lambda number: issue)
    pulls, issues = GitHubClient.collaboration(repo)
    assert len(pulls) == len(issues) == 1
    assert pulls[0]['state'] == 'closed' and issues[0]['closer'] == 'actual-closer'


def test_empty_repository_and_inactivity():
    result = WeightedContributionScorer().score(RepoAnalysis(
        owner='demo', repo='empty', branch='main', default_branch='main', commits=[], files=[],
        students=[StudentIdentity(usn='U1')], analyzed_at='2026-07-01T00:00:00Z'))
    assert result.total_commits == 0 and result.total_authors == 0
    assert result.contributors[0].inactive_days == 1 and result.contributors[0].score == 0

def test_utc_calendar_cutoffs_and_ambiguous_names():
    from services.models import CommitRecord

    def commit(sha, author, when):
        return CommitRecord(sha=sha, author=author, date=when, message='Change', total=1,
                            additions=1, deletions=0, files=['x.py'])

    result = WeightedContributionScorer().score(RepoAnalysis(
        owner='demo', repo='timing', branch='main', default_branch='main', files=[],
        students=[StudentIdentity(usn='A', login='alice'), StudentIdentity(usn='B', login='bob'),
                  StudentIdentity(usn='S1', name='Sam'), StudentIdentity(usn='S2', name='Sam')],
        commits=[commit('a', 'alice', '2026-07-08T01:00:00+05:30'),
                 commit('b', 'bob', '2026-06-30T01:00:00Z'), commit('c', 'sam@example.test', '2026-07-15T00:00:00Z')],
        authors={'sam@example.test': {'names': ['Sam'], 'emails': ['sam@example.test']}},
        analyzed_at='2026-07-15T14:00:00Z'))
    rows = {r.usn: r for r in result.contributors}
    assert rows['A'].daily_commits == {'2026-07-07': 1}
    assert rows['A'].weekly_commits == {'2026-07-06': 1}
    assert rows['A'].status == 'AT_RISK' and rows['B'].status == 'INACTIVE'
    assert rows['S1'].commits == rows['S2'].commits == 0
    assert rows[None].commits == 1
