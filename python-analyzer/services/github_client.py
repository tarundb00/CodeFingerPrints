from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from github import Auth, Github

from .git_history import GitHistory, clone_repository
from .models import RepoAnalysis


def login(user):
    return user.login if user else None


def stamp(value):
    return value.astimezone(timezone.utc).isoformat() if value else None


class GitHubClient:
    def __init__(self, token=None):
        self.token = token
        self.client = Github(auth=Auth.Token(token) if token else None, per_page=100, timeout=30, retry=0)

    def get_repo(self, owner, repo_name):
        full_name = repo_name if '/' in repo_name else f'{owner}/{repo_name}' if owner else None
        if not full_name or len(full_name.split('/')) != 2:
            raise ValueError('Use owner/repository or provide an owner.')
        return self.client.get_repo(full_name)

    @staticmethod
    def collaboration(repo):
        pulls, issues = [], []
        for pr in repo.get_pulls(state='all'):
            reviews = [{'author': login(r.user), 'state': r.state, 'date': stamp(r.submitted_at)}
                       for r in pr.get_reviews() if r.submitted_at and r.state != 'PENDING']
            pulls.append({'number': pr.number, 'title': pr.title, 'author': login(pr.user),
                          'date': stamp(pr.created_at), 'closed_at': stamp(pr.closed_at),
                          'merged_by': login(pr.merged_by) if pr.merged_at else None,
                          'state': 'merged' if pr.merged_at else 'closed' if pr.state == 'closed' else 'open',
                          'reviews': reviews})
        if repo.has_issues:
            pull_numbers = {pr['number'] for pr in pulls}
            for issue in repo.get_issues(state='all'):
                if issue.number in pull_numbers:
                    continue
                # PyGithub completes the issue once when detailed fields are requested.
                details = issue.raw_data
                if 'pull_request' in details:
                    continue
                issues.append({'number': issue.number, 'title': issue.title, 'author': login(issue.user),
                               'date': stamp(issue.created_at), 'state': issue.state,
                               'reason': details.get('state_reason'), 'closed_at': stamp(issue.closed_at),
                               'closer': login(issue.closed_by) if issue.closed_at else None,
                               'assignees': [u.login for u in issue.assignees],
                               'bug': any(label.name.casefold() in {'bug', 'defect'} for label in issue.labels)})
        return pulls, issues

    def analyze_repo(self, repo, branch=None, students=()):
        branch = branch or repo.default_branch
        authors, identities = {}, {}

        def identify(sha, name, email):
            key = email.casefold() or name
            if key not in identities:
                account = login(repo.get_commit(sha).author)
                identities[key] = account or email or name or 'unknown'
                authors.setdefault(identities[key], {'login': account, 'names': set(), 'emails': set()})
            identity = authors[identities[key]]
            if name:
                identity['names'].add(name)
            if email:
                identity['emails'].add(email)
            return identities[key]

        with TemporaryDirectory(prefix='codefingerprint-') as directory:
            path = Path(directory) / 'history.git'
            clone_repository(repo.full_name, self.token, path)
            history = GitHistory(path)
            commits, fixes = history.commits(identify)
            files = history.files(branch) if commits else []
        pulls, issues = self.collaboration(repo)
        return RepoAnalysis(owner=repo.owner.login, repo=repo.name, branch=branch,
                            default_branch=repo.default_branch, commits=commits, files=files,
                            authors=authors, pulls=pulls, issues=issues, fixes=fixes, students=students,
                            analyzed_at=datetime.now(timezone.utc))
