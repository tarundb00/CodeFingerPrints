from typing import Dict, List, Any
from .models import RepoAnalysis, AnalyzeResult, ContributionRow
from .ast_analyzer import ASTCodeAnalyzer
from .authorship_attribution import StylometryAttributionEngine
from .szz_tracker import SZZBugTracker
from .ai_code_detector import GraphCodeBERTClassifier
from collections import defaultdict
import datetime


class WeightedContributionScorer:
    """
    Absolute-scale Contribution Scoring Model.
    Each student is scored independently against semester targets.
    No relative normalization.
    """

    TARGET_COMMITS = 5
    TARGET_ADDITIONS = 500
    TARGET_ACTIVE_DAYS = 3
    TARGET_FUNCTIONS = 5
    TARGET_BUG_FIXES = 1
    WEIGHT_COMMITS = 30
    WEIGHT_LINES = 20
    WEIGHT_CONSISTENCY = 20
    WEIGHT_CODE_QUALITY = 15
    WEIGHT_BUG_BONUS = 15
    AI_PENALTY_PER_UNIT = 15
    BUG_INTRO_PENALTY = 8

    def __init__(self):
        self.ast_analyzer = ASTCodeAnalyzer()
        self.stylometry_engine = StylometryAttributionEngine()
        self.szz_tracker = SZZBugTracker()
        self.ai_detector = GraphCodeBERTClassifier()

    def score(self, analysis: RepoAnalysis) -> AnalyzeResult:
        author_data = defaultdict(lambda: {
            "commits": 0,
            "additions": 0,
            "deletions": 0,
            "active_dates": set(),
            "last_commit_date": None,
            "bug_risk": 0.0,
            "ai_risk": 0.0,
            "functions_written": 0,
            "bug_fixes": 0,
            "code_samples": [],
        })
        bug_alerts = []
        ai_alerts = []

        szz_results = self.szz_tracker.analyze_commit_history(analysis.commits)
        for event in szz_results.get("bug_events", []):
            bug_alerts.append(
                f"{event['fix_author']}: Fixed defect (likely introduced by {event['likely_introducing_author']})"
            )
        szz_author_metrics = szz_results.get("author_szz_metrics", {})

        for commit in analysis.commits:
            if hasattr(commit, 'author'):
                author = commit.author
            elif isinstance(commit, dict):
                author = commit.get('author', 'unknown')
            else:
                author = 'unknown'
            if not author:
                author = 'unknown'
            data = author_data[author]
            data["commits"] += 1

            additions = commit.additions if hasattr(commit, 'additions') else (commit.get('additions', 0) if isinstance(commit, dict) else 0)
            deletions = commit.deletions if hasattr(commit, 'deletions') else (commit.get('deletions', 0) if isinstance(commit, dict) else 0)
            data["additions"] += additions
            data["deletions"] += deletions

            commit_date = commit.date if hasattr(commit, 'date') else (commit.get('date', '') if isinstance(commit, dict) else '')
            commit_date_str = commit_date.isoformat() if hasattr(commit_date, 'isoformat') else str(commit_date)
            data["active_dates"].add(commit_date_str[:10])
            if data["last_commit_date"] is None or commit_date_str > str(data["last_commit_date"]):
                data["last_commit_date"] = commit_date_str

        for author, metrics in szz_author_metrics.items():
            if author in author_data:
                author_data[author]["bug_risk"] = round(metrics.get("bugs_introduced", 0) * 1.0, 2)
                author_data[author]["bug_fixes"] = metrics.get("bugs_fixed", 0)

        total_functions_global = 0
        for file_rec in analysis.files:
            content = file_rec.content if hasattr(file_rec, 'content') else (file_rec.get('content', '') if isinstance(file_rec, dict) else '')
            path = file_rec.path if hasattr(file_rec, 'path') else (file_rec.get('path', '') if isinstance(file_rec, dict) else '')
            if not content:
                continue
            if path.endswith('.py'):
                ast_metrics = self.ast_analyzer.analyze_file_structure(path, content)
                total_functions_global += ast_metrics.get('metrics', {}).get('total_functions', 0)
            
            ai_eval = self.ai_detector.detect_ai_generation(content)
            if ai_eval['is_ai_generated']:
                ai_alerts.append(
                    f"File '{path}' flagged: {round(ai_eval['ai_probability'] * 100)}% AI [{ai_eval['confidence_level']}]"
                )
            
            # Map AI Risk to authors who modified this file
            if ai_eval['ai_probability'] > 0:
                for commit in analysis.commits:
                    c_files = commit.files if hasattr(commit, 'files') else (commit.get('files', []) if isinstance(commit, dict) else [])
                    if path in c_files:
                        author = commit.author if hasattr(commit, 'author') else (commit.get('author', 'unknown') if isinstance(commit, dict) else 'unknown')
                        if not author: author = 'unknown'
                        # Use the highest AI probability found across the files they touched
                        author_data[author]["ai_risk"] = max(
                            author_data[author].get("ai_risk", 0.0), 
                            round(ai_eval['ai_probability'] * 100, 2)
                        )

        if total_functions_global == 0:
            total_lines = sum(
                (len(f.content.splitlines()) if hasattr(f, 'content') else len(f.get('content', '').splitlines()))
                for f in analysis.files
            )
            total_functions_global = max(0, total_lines // 30)

        total_additions = sum(d['additions'] for d in author_data.values()) or 1
        for author, data in author_data.items():
            data['functions_written'] = max(0, round(total_functions_global * data['additions'] / total_additions))

        contributors: List[ContributionRow] = []
        for author, data in author_data.items():
            active_days = len(data['active_dates'])
            score = self._calculate_absolute_score(
                commits=data['commits'],
                additions=data['additions'],
                active_days=active_days,
                functions=data['functions_written'],
                bug_fixes=data['bug_fixes'],
                bug_risk=data['bug_risk'],
                ai_risk=data['ai_risk'],
            )
            lcd = data['last_commit_date']
            if lcd and hasattr(lcd, 'isoformat'):
                lcd = lcd.isoformat()
            elif lcd:
                lcd = str(lcd)
            contributors.append(ContributionRow(
                author=author,
                commits=data['commits'],
                additions=data['additions'],
                deletions=data['deletions'],
                active_days=active_days,
                last_commit_date=lcd,
                bug_risk=round(data['bug_risk'], 2),
                ai_risk=round(data['ai_risk'], 2),
                score=score,
            ))

        contributors.sort(key=lambda row: row.score, reverse=True)
        analyzed_at = analysis.analyzed_at
        if hasattr(analyzed_at, 'isoformat'):
            analyzed_at = analyzed_at.isoformat()
        else:
            analyzed_at = str(analyzed_at)

        return AnalyzeResult(
            owner=analysis.owner,
            repo=analysis.repo,
            branch=analysis.branch,
            analyzed_at=analyzed_at,
            total_commits=len(analysis.commits),
            total_authors=len(contributors),
            contributors=contributors,
            bug_alerts=bug_alerts[:10],
            ai_alerts=ai_alerts[:10],
        )

    def _calculate_absolute_score(
        self, commits, additions, active_days, functions, bug_fixes, bug_risk, ai_risk
    ) -> float:
        commit_ratio = min(1.0, commits / self.TARGET_COMMITS)
        lines_ratio = min(1.0, additions / self.TARGET_ADDITIONS)
        consistency_ratio = min(1.0, active_days / self.TARGET_ACTIVE_DAYS)
        quality_ratio = min(1.0, functions / max(1, self.TARGET_FUNCTIONS))
        bug_ratio = min(1.0, bug_fixes / self.TARGET_BUG_FIXES)
        weighted = (
            commit_ratio * self.WEIGHT_COMMITS
            + lines_ratio * self.WEIGHT_LINES
            + consistency_ratio * self.WEIGHT_CONSISTENCY
            + quality_ratio * self.WEIGHT_CODE_QUALITY
            + bug_ratio * self.WEIGHT_BUG_BONUS
        )
        final = max(0.0, weighted - bug_risk * self.BUG_INTRO_PENALTY)
        return round(min(100.0, final), 2)
