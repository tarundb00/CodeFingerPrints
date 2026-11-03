from typing import List, Dict, Any
import re


class SZZBugTracker:
    """
    SZZ Algorithm Engine (PySZZ v2 - 2023).
    Differentiates bug-fixing commits (BFCs) from bug-introducing commits (BICs).
    Identifies which developers introduced defects vs. which developers resolved them.
    """

    BUG_FIX_PATTERNS = [
        r'\b(fix|fixed|fixes|patch|patched|resolve|resolved|resolves)\b',
        r'\b(bug|issue|defect|error|fault|crash|vulnerability)\b',
        r'#\d+',
        r'close[s]?\s*#\d+'
    ]

    def is_bug_fixing_commit(self, message: str) -> bool:
        """Determines if a commit is a Bug Fixing Commit (BFC) via semantic regex matching."""
        msg_lower = message.lower()
        has_fix_word = any(re.search(p, msg_lower) for p in self.BUG_FIX_PATTERNS)
        return bool(has_fix_word)

    def analyze_commit_history(self, commits: List[Any]) -> Dict[str, Any]:
        """
        Executes SZZ attribution across the repository commit timeline:
        - Flags BFCs (Bug-Fixing Commits)
        - Computes Bug Introducer Score vs. Bug Resolver Score per author
        """
        fixers: Dict[str, int] = {}
        introducers: Dict[str, int] = {}
        bug_events: List[Dict[str, Any]] = []

        # Sort commits chronologically if date available
        sorted_commits = sorted(commits, key=lambda c: str(getattr(c, "date", "")))

        for i, commit in enumerate(sorted_commits):
            msg = getattr(commit, "message", "")
            author = getattr(commit, "author", "unknown")
            sha = getattr(commit, "sha", f"commit_{i}")
            files = getattr(commit, "files", [])

            if self.is_bug_fixing_commit(msg):
                fixers[author] = fixers.get(author, 0) + 1
                
                # Look backwards in commit graph for BICs touching the same modified files
                likely_introducer = None
                if files:
                    for prev_commit in reversed(sorted_commits[:i]):
                        prev_author = getattr(prev_commit, "author", "unknown")
                        prev_files = getattr(prev_commit, "files", [])
                        if set(files).intersection(set(prev_files)) and prev_author != author:
                            likely_introducer = prev_author
                            introducers[prev_author] = introducers.get(prev_author, 0) + 1
                            break

                bug_events.append({
                    "fix_commit_sha": sha[:7],
                    "fix_author": author,
                    "likely_introducing_author": likely_introducer or "Legacy / Prior",
                    "commit_message": msg.strip().splitlines()[0] if msg else "",
                    "impacted_files": files[:3]
                })

        all_authors = set(list(fixers.keys()) + list(introducers.keys()))
        author_stats = {}
        for auth in all_authors:
            num_fixes = fixers.get(auth, 0)
            num_intro = introducers.get(auth, 0)
            # Net bug impact index (higher is better; positive = more fixes than introductions)
            net_impact = num_fixes - num_intro
            author_stats[auth] = {
                "bugs_fixed": num_fixes,
                "bugs_introduced": num_intro,
                "net_bug_impact": net_impact,
                "szz_defect_ratio": round(num_intro / max(1, num_fixes + num_intro), 2)
            }

        return {
            "total_bug_fix_commits": sum(fixers.values()),
            "total_bugs_detected": len(bug_events),
            "bug_events": bug_events[:15],
            "author_szz_metrics": author_stats
        }
