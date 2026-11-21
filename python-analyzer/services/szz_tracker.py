from bisect import bisect_left, bisect_right
import re


class SZZBugTracker:
    """Trace nonblank lines removed by a candidate fix to their parent-revision blame."""

    FIX = re.compile(r'\b(?:fix(?:ed|es|ing)?|patch(?:ed)?|hotfix|bugfix|resolv(?:e|ed|es))\b', re.I)
    HUNK = re.compile(r'^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@')

    @classmethod
    def candidates(cls, message, changes, parent, diff, blame):
        if not cls.FIX.search(message):
            return None
        evidence = []
        for change in changes if parent else []:
            if change['status'] not in {'M', 'D', 'R'} or not change['old_blob']:
                continue
            path = change['old_path']
            removed = set()
            line = None
            for record in diff(change).split('\n'):
                match = cls.HUNK.match(record)
                if match:
                    line = int(match[1])
                elif line is not None and record.startswith('-'):
                    if record[1:].strip():
                        removed.add(line)
                    line += 1
                elif line is not None and record.startswith(' '):
                    line += 1
            if removed:
                positions = sorted(removed)
                for start, end, sha in blame(parent, path):
                    lines = positions[bisect_left(positions, start):bisect_right(positions, end)]
                    if lines:
                        evidence.append({'sha': sha, 'path': path, 'lines': lines})
        return evidence
