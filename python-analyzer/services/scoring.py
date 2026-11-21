from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from .ai_code_detector import GraphCodeBERTClassifier
from .code_quality import analyze_sources
from .models import AnalyzeResult, ContributionRow


# Absolute, capped targets. The same points are returned to every score display.
RUBRIC = {'code': (35, 500), 'commits': (20, 5), 'pull_requests': (15, 2),
          'reviews': (15, 2), 'issues': (15, 2)}


def utc(value):
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).astimezone(timezone.utc)


def stamp(value):
    return utc(value).isoformat().replace('+00:00', 'Z')


class WeightedContributionScorer:
    def score(self, analysis):
        rows = {}
        roster = defaultdict(set)
        for student in analysis.students:
            key = f'student:{student.usn}'
            rows[key] = ContributionRow(author=student.login or student.name or student.usn, usn=student.usn)
            for kind, value in [('login', student.login), ('email', student.email), ('name', student.name)]:
                if value:
                    roster[kind, value.strip().casefold()].add(key)

        def person(author):
            if not author:
                return None
            identity = analysis.authors.get(author, {})
            identifiers = [('login', [identity.get('login') or author]),
                           ('email', identity.get('emails') or [identity.get('email')])]
            if not identity.get('login'):
                identifiers.append(('name', identity.get('names') or [identity.get('name')]))
            for kind, values in identifiers:
                matches = set()
                for value in values:
                    if value:
                        matches.update(roster.get((kind, value.strip().casefold()), ()))
                if len(matches) == 1:
                    return rows[next(iter(matches))]
                if matches:
                    break
            key = author.casefold()
            if key not in rows:
                rows[key] = ContributionRow(author=author)
            return rows[key]

        def activity(row, when):
            if row is None or not when:
                return
            instant = utc(when)
            day = instant.date().isoformat()
            week = (instant.date() - timedelta(days=instant.weekday())).isoformat()
            row.daily[day] = row.daily.get(day, 0) + 1
            row.weekly[week] = row.weekly.get(week, 0) + 1
            if row.last_activity is None or instant > utc(row.last_activity):
                row.last_activity = stamp(instant)

        by_sha = {c.sha: c for c in analysis.commits}
        modified, created = defaultdict(set), defaultdict(set)
        authors_by_sha = {}
        for commit in sorted(analysis.commits, key=lambda c: utc(c.date), reverse=True):
            row = person(commit.author)
            # Roster IDs remain distinct even when two students share a display name.
            key = f'student:{row.usn}' if row.usn else row.author.casefold()
            authors_by_sha[commit.sha] = key
            row.commits += 1
            row.additions += commit.additions
            row.deletions += commit.deletions
            modified[key].update(commit.files)
            created[key].update(commit.created)
            when = stamp(commit.date)
            if row.last_commit_date is None:
                row.last_commit_date = when
            row.commit_history.append({'sha': commit.sha, 'date': when,
                                       'title': (commit.message.splitlines() or [''])[0],
                                       'additions': commit.additions, 'deletions': commit.deletions})
            activity(row, when)
            commit_day = utc(when).date()
            week = (commit_day - timedelta(days=commit_day.weekday())).isoformat()
            row.daily_commits[when[:10]] = row.daily_commits.get(when[:10], 0) + 1
            row.weekly_commits[week] = row.weekly_commits.get(week, 0) + 1

        for pr in analysis.pulls:
            submitter = analysis.portal_pull_authors.get(pr['number'])
            row = rows.get(f'student:{submitter}') if submitter else None
            if row:
                pr = {**pr, 'github_author': pr['author'], 'author': row.author}
            else:
                row = person(pr['author'])
            if row:
                row.pull_requests += 1
                row.merged += int(pr['state'] == 'merged')
                row.rejected += int(pr['state'] == 'closed')
                row.pr_history.append(pr)
                activity(row, pr['date'])
            if pr.get('merged_by'):
                activity(person(pr['merged_by']), pr['closed_at'])
            for review in pr['reviews']:
                reviewer = person(review['author'])
                if reviewer:
                    reviewer.reviews += 1
                    reviewer.approvals += int(review['state'] == 'APPROVED')
                    reviewer.review_history.append({'number': pr['number'], 'title': pr['title'], **review})
                    activity(reviewer, review['date'])

        resolutions, bug_resolutions = defaultdict(list), defaultdict(list)
        for issue in analysis.issues:
            opener = person(issue['author'])
            if opener:
                opener.issues_created += 1
                activity(opener, issue['date'])
            closer = person(issue['closer']) if issue['state'] == 'closed' else None
            resolved = closer is not None and issue.get('reason') not in {'not_planned', 'duplicate'}
            hours = None
            if closer:
                activity(closer, issue['closed_at'])
                if resolved:
                    closer.issues_closed += 1
                    closer.bugs_resolved += int(issue['bug'])
                    hours = round((utc(issue['closed_at']) - utc(issue['date'])).total_seconds() / 3600, 2)
                    resolutions[id(closer)].append(hours)
                    if issue['bug']:
                        bug_resolutions[id(closer)].append(hours)
            assignees = {id(p): p for a in issue['assignees'] if (p := person(a)) is not None}
            for assignee in assignees.values():
                assignee.assigned_issues += 1
            participants = [opener, closer, *assignees.values()]
            for row in {id(p): p for p in participants if p is not None}.values():
                row.issue_history.append({**issue, 'resolution_hours': hours})

        ownership, quality = analyze_sources(analysis.files, authors_by_sha)
        detector = GraphCodeBERTClassifier()
        ai_alerts = []
        for file in analysis.files:
            ai = detector.detect_ai_generation(file.content)
            probability = round(ai['ai_probability'] * 100, 2)
            if ai['is_ai_generated']:
                ai_alerts.append(f'{file.path}: automated style signal {probability}%')
            for key in {authors_by_sha[s] for _, _, s in file.blame if s in authors_by_sha}:
                rows[key].ai_risk = max(rows[key].ai_risk, probability)

        bug_alerts = []
        for fix in analysis.fixes:
            commit = by_sha[fix['fix_sha']]
            fixer = person(commit.author)
            event = {'sha': commit.sha, 'fixer': fixer.author, 'date': stamp(commit.date),
                     'title': (commit.message.splitlines() or [''])[0], 'candidates': []}
            participants = {id(fixer): fixer}
            for hit in fix['evidence']:
                origin = by_sha.get(hit['sha'])
                if not origin:
                    continue
                author = person(origin.author)
                participants[id(author)] = author
                hours = round((utc(commit.date) - utc(origin.date)).total_seconds() / 3600, 2)
                event['candidates'].append({**hit, 'author': author.author,
                                            'age_hours': hours if hours >= 0 else None})
            for row in participants.values():
                row.bug_events.append(event)
            for author in {c['sha'] for c in event['candidates']}:
                person(by_sha[author].author).bug_risk += 1
            bug_alerts.append(f'{fixer.author}: {commit.sha[:8]} has {len(event["candidates"])} candidate line ranges.')

        today = utc(analysis.analyzed_at).date()
        first = min([today.isoformat(), *(day for row in rows.values() for day in row.daily)])
        days = (today - date.fromisoformat(first)).days + 1
        total_churn = sum(r.additions + r.deletions for r in rows.values())
        for key, row in rows.items():
            row.ownership = ownership.get(key, [])
            row.files_modified = sorted(modified[key])
            row.files_created = sorted(created[key])
            row.active_days = len(row.daily)
            row.inactive_days = max(0, days - row.active_days)
            if row.last_activity:
                age = (today - utc(row.last_activity).date()).days
                row.status = 'INACTIVE' if age > 14 else 'AT_RISK' if age > 7 else 'ACTIVE'
            churn = row.additions + row.deletions
            row.code_share = round(100 * churn / total_churn, 2) if total_churn else 0
            hours = resolutions[id(row)]
            bug_hours = bug_resolutions[id(row)]
            if bug_hours:
                row.mean_bug_resolution_hours = round(sum(bug_hours) / len(bug_hours), 2)
            if hours:
                row.mean_resolution_hours = round(sum(hours) / len(hours), 2)
            values = {'code': churn, 'commits': row.commits, 'pull_requests': row.pull_requests,
                      'reviews': len({r['number'] for r in row.review_history}), 'issues': row.issues_closed}
            row.score_parts = {k: round(weight * min(1, values[k] / target), 2)
                               for k, (weight, target) in RUBRIC.items()}
            row.score = round(sum(row.score_parts.values()), 2)

        return AnalyzeResult(owner=analysis.owner, repo=analysis.repo, branch=analysis.branch,
                             analyzed_at=stamp(analysis.analyzed_at), period_start=first,
                             total_commits=len(by_sha), total_authors=sum(bool(r.daily) for r in rows.values()),
                             contributors=sorted(rows.values(), key=lambda r: (-r.score, r.author.casefold())),
                             quality=quality, bug_alerts=bug_alerts, ai_alerts=ai_alerts)
