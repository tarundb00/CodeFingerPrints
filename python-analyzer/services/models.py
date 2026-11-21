from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class StudentIdentity(BaseModel):
    usn: str
    login: str | None = None
    email: str | None = None
    name: str | None = None


class AnalyzeRequest(BaseModel):
    owner: str | None = None
    repo: str
    branch: str | None = None
    token: str | None = None
    students: list[StudentIdentity] = Field(default_factory=list)
    portal_pull_authors: dict[int, str] = Field(default_factory=dict)


class CommitRecord(BaseModel):
    sha: str
    author: str
    message: str
    date: datetime
    total: int
    additions: int
    deletions: int
    files: list[str]
    created: list[str] = Field(default_factory=list)


class FileRecord(BaseModel):
    path: str
    content: str
    # Inclusive, one-based final line range and the originating commit.
    blame: list[tuple[int, int, str]] = Field(default_factory=list)


class RepoAnalysis(BaseModel):
    owner: str
    repo: str
    branch: str
    default_branch: str
    commits: list[CommitRecord]
    files: list[FileRecord]
    authors: dict[str, Any] = Field(default_factory=dict)
    pulls: list[dict] = Field(default_factory=list)
    issues: list[dict] = Field(default_factory=list)
    fixes: list[dict] = Field(default_factory=list)
    portal_pull_authors: dict[int, str] = Field(default_factory=dict)
    students: list[StudentIdentity] = Field(default_factory=list)
    analyzed_at: datetime


class ContributionRow(BaseModel):
    author: str
    usn: str | None = None
    commits: int = 0
    additions: int = 0
    deletions: int = 0
    active_days: int = 0
    inactive_days: int = 0
    last_commit_date: str | None = None
    last_activity: str | None = None
    status: str = 'NOT_CONTRIBUTING'
    bug_risk: float = 0
    ai_risk: float = 0
    score: float = 0
    code_share: float = 0
    pull_requests: int = 0
    merged: int = 0
    rejected: int = 0
    reviews: int = 0
    approvals: int = 0
    issues_created: int = 0
    issues_closed: int = 0
    bugs_resolved: int = 0
    assigned_issues: int = 0
    mean_bug_resolution_hours: float | None = None
    mean_resolution_hours: float | None = None
    files_modified: list[str] = Field(default_factory=list)
    files_created: list[str] = Field(default_factory=list)
    daily: dict[str, int] = Field(default_factory=dict)
    weekly: dict[str, int] = Field(default_factory=dict)
    daily_commits: dict[str, int] = Field(default_factory=dict)
    weekly_commits: dict[str, int] = Field(default_factory=dict)
    score_parts: dict[str, float] = Field(default_factory=dict)
    commit_history: list[dict] = Field(default_factory=list)
    pr_history: list[dict] = Field(default_factory=list)
    review_history: list[dict] = Field(default_factory=list)
    issue_history: list[dict] = Field(default_factory=list)
    ownership: list[dict] = Field(default_factory=list)
    bug_events: list[dict] = Field(default_factory=list)


class AnalyzeResult(BaseModel):
    owner: str
    repo: str
    branch: str
    analyzed_at: str
    period_start: str
    total_commits: int
    total_authors: int
    contributors: list[ContributionRow]
    quality: list[dict]
    bug_alerts: list[str]
    ai_alerts: list[str]
