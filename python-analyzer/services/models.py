from pydantic import BaseModel
from typing import Any, List, Optional
import datetime


class AnalyzeRequest(BaseModel):
    owner: str
    repo: str
    branch: Optional[str] = None
    token: Optional[str] = None


class CommitRecord(BaseModel):
    sha: str
    author: str
    message: str
    date: Any
    total: int
    additions: int
    deletions: int
    files: List[str]


class FileRecord(BaseModel):
    path: str
    content: str


class RepoAnalysis(BaseModel):
    owner: str
    repo: str
    branch: str
    default_branch: str
    commits: List[CommitRecord]
    authors: dict[str, Any]
    files: List[FileRecord]
    analyzed_at: Any


class ContributionRow(BaseModel):
    author: str
    commits: int
    additions: int
    deletions: int
    active_days: int
    last_commit_date: Optional[str] = None
    bug_risk: float
    ai_risk: float
    score: float


class AnalyzeResult(BaseModel):
    owner: str
    repo: str
    branch: str
    analyzed_at: str
    total_commits: int
    total_authors: int
    contributors: List[ContributionRow]
    bug_alerts: List[str]
    ai_alerts: List[str]
