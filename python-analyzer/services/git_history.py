"""Read Git objects without checking out or executing repository code."""
import base64
import os
import re
import subprocess
from functools import lru_cache
from pathlib import PurePosixPath

from .models import CommitRecord, FileRecord
from .szz_tracker import SZZBugTracker


SKIP_DIRS = {'.git', '.venv', 'venv', '__pycache__', 'node_modules', 'vendor', 'build',
             'dist', 'target', '.next', 'coverage'}
SOURCE_EXTENSIONS = {'.py', '.java', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.kt',
                     '.go', '.c', '.h', '.cpp', '.cs', '.rs', '.css', '.html', '.sql',
                     '.md', '.yml', '.yaml', '.sh'}


def clone_repository(full_name, token, destination):
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', full_name, re.ASCII):
        raise ValueError('Invalid GitHub repository name.')
    env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'Never'}
    if token:
        credential = base64.b64encode(f'x-access-token:{token}'.encode()).decode()
        env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraHeader',
                   GIT_CONFIG_VALUE_0=f'Authorization: Basic {credential}')
    result = subprocess.run(['git', '-c', 'credential.helper=', 'clone', '--bare',
                             '--quiet', '--', f'https://github.com/{full_name}.git', destination],
                            env=env, capture_output=True, timeout=600)
    if result.returncode:
        raise RuntimeError('Git could not read this repository. Check network and Contents access.')


class GitHistory:
    def __init__(self, directory):
        self.directory = directory
        self.blame = lru_cache(maxsize=128)(self._blame)

    def git(self, *args):
        result = subprocess.run(['git', '--literal-pathspecs', '-C', self.directory, *args],
                                capture_output=True, check=True, timeout=180)
        return result.stdout.decode('utf-8', errors='replace')

    def _blame(self, revision, path):
        output = self.git('blame', '--incremental', '--no-textconv', revision, '--', path)
        ranges = []
        for line in output.split('\n'):
            match = re.fullmatch(r'([a-f0-9]{40,64}) \d+ (\d+) (\d+)', line)
            if match:
                sha, start, count = match.groups()
                ranges.append((int(start), int(start) + int(count) - 1, sha))
        return sorted(ranges)

    def changes(self, sha):
        # Raw records carry the status and blob IDs. Numstat follows in the same order.
        parts = self.git('diff-tree', '--root', '--no-commit-id', '-r', '-M', '--raw',
                         '--numstat', '-z', sha).split('\0')
        changes = []
        i = 0
        while parts[i].startswith(':'):
            old_mode, new_mode, before, after, status = parts[i][1:].split()
            old_path = path = parts[i + 1]
            i += 2
            if status[0] in {'R', 'C'}:
                path = parts[i]
                i += 1
            changes.append({'path': path, 'old_path': old_path, 'status': status[0],
                            'old_blob': before if old_mode.startswith('100') else None,
                            'new_blob': after if new_mode.startswith('100') else None})
        added = deleted = 0
        while i < len(parts) and parts[i]:
            plus, minus, path = parts[i].split('\t', 2)
            added += int(plus) if plus.isdigit() else 0
            deleted += int(minus) if minus.isdigit() else 0
            i += 1 if path else 3
        return changes, added, deleted

    def commits(self, identify):
        fields = self.git('log', '--branches', '--tags', '-z', '--no-show-signature',
                          '--format=%H%x00%P%x00%an%x00%ae%x00%aI%x00%B').split('\0')
        records, fixes = [], []
        for i in range(0, len(fields) - 1, 6):
            sha, parents, name, email, date, message = fields[i:i + 6]
            author = identify(sha, name, email)
            parents = parents.split()
            # Merged commits are reachable independently. Do not count their line changes twice.
            changes, added, deleted = self.changes(sha) if len(parents) < 2 else ([], 0, 0)
            record = CommitRecord(sha=sha, author=author, date=date, message=message.strip(),
                                  additions=added, deletions=deleted, total=added + deleted,
                                  files=[c['path'] for c in changes],
                                  created=[c['path'] for c in changes if c['status'] in {'A', 'C'}])
            records.append(record)
            if len(parents) > 1:
                continue
            parent = parents[0] if parents else None

            def diff(change):
                args = (change['old_blob'], change['new_blob']) if change['new_blob'] else (
                    parent, sha, '--', change['old_path'])
                return self.git('diff', '--no-ext-diff', '--no-textconv', '--unified=0', *args)

            evidence = SZZBugTracker.candidates(record.message, changes, parent, diff, self.blame)
            if evidence is not None:
                fixes.append({'fix_sha': sha, 'evidence': evidence})
        return records, fixes

    def files(self, branch):
        ref = self.git('rev-parse', '--verify', '--end-of-options', f'refs/heads/{branch}^{{commit}}').strip()
        files = []
        for entry in self.git('ls-tree', '-rz', ref).split('\0'):
            if not entry:
                continue
            metadata, name = entry.split('\t', 1)
            mode, kind, oid = metadata.split()
            path = PurePosixPath(name)
            if (not mode.startswith('100') or kind != 'blob' or path.suffix.lower() not in SOURCE_EXTENSIONS
                    or SKIP_DIRS.intersection(path.parts) or '.min.' in name):
                continue
            content = self.git('cat-file', 'blob', oid)
            if '\0' not in content:
                files.append(FileRecord(path=name, content=content, blame=self.blame(ref, name)))
        return files
