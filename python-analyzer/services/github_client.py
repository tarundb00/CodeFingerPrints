from github import Github
from github.Repository import Repository
from typing import Any, List
from .models import RepoAnalysis, FileRecord, CommitRecord
import datetime


ANALYZABLE_EXTENSIONS = (
    '.py', '.js', '.ts', '.jsx', '.tsx',
    '.java', '.kt', '.go', '.c', '.cpp', '.cs',
)


class GitHubClient:
    def __init__(self, token: str | None = None):
        if token:
            self.client = Github(token, per_page=100)
        else:
            self.client = Github()

    def get_repo(self, owner: str | None, repo_name: str) -> Repository:
        if repo_name and '/' in repo_name:
            return self.client.get_repo(repo_name)
        if owner:
            return self.client.get_repo(f'{owner}/{repo_name}')
        raise ValueError('Repository owner is required when repo name is not a full path')

    def analyze_repo(self, repo: Repository, branch: str | None = None) -> RepoAnalysis:
        branch_name = branch or repo.default_branch
        seen_shas: set = set()
        all_branches = [b.name for b in repo.get_branches()]
        if branch_name not in all_branches:
            all_branches.append(branch_name)

        authors: dict = {}
        commit_records: List[CommitRecord] = []

        for b_name in all_branches:
            try:
                for commit in repo.get_commits(sha=b_name):
                    if commit.sha in seen_shas:
                        continue
                    seen_shas.add(commit.sha)
                    if commit.author and commit.author.login:
                        author = commit.author.login
                    elif commit.commit.author.name:
                        author = commit.commit.author.name
                    else:
                        author = commit.commit.author.email or 'unknown'
                    message = commit.commit.message or ''
                    date = commit.commit.author.date
                    stats = commit.stats
                    commit_records.append(CommitRecord(
                        sha=commit.sha, author=author, message=message, date=date,
                        total=stats.total, additions=stats.additions, deletions=stats.deletions,
                        files=[f.filename for f in commit.files] if commit.files else [],
                    ))
                    if author not in authors:
                        authors[author] = {'commits': 0, 'additions': 0, 'deletions': 0}
                    authors[author]['commits'] += 1
                    authors[author]['additions'] += stats.additions
                    authors[author]['deletions'] += stats.deletions
            except Exception:
                continue

        files = self._collect_files(repo, branch_name)
        return RepoAnalysis(
            owner=repo.owner.login, repo=repo.name, branch=branch_name,
            default_branch=repo.default_branch, commits=commit_records,
            authors=authors, files=files,
            analyzed_at=datetime.datetime.utcnow().isoformat() + 'Z',
        )

    def _collect_files(self, repo: Repository, branch: str) -> List[FileRecord]:
        try:
            tree = repo.get_git_tree(branch, recursive=True).tree
        except Exception:
            return []
        files: List[FileRecord] = []
        for element in tree:
            if element.type != 'blob':
                continue
            if not any(element.path.endswith(ext) for ext in ANALYZABLE_EXTENSIONS):
                continue
            if any(skip in element.path for skip in ['node_modules/', 'vendor/', '.min.', 'dist/', 'build/', '__pycache__/']):
                continue
            try:
                content = repo.get_contents(element.path, ref=branch).decoded_content.decode('utf-8', errors='replace')
                files.append(FileRecord(path=element.path, content=content))
            except Exception:
                continue
        return files
