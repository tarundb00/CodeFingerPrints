from services.models import RepoAnalysis, CommitRecord, AnalyzeResult
from services.scoring import ContributionScorer


def test_contribution_scoring():
    analysis = RepoAnalysis(
        owner="example",
        repo="demo",
        branch="main",
        default_branch="main",
        commits=[
            CommitRecord(
                sha="abc123",
                author="alice",
                message="Add feature X",
                date="2026-07-01T12:00:00Z",
                total=10,
                additions=100,
                deletions=5,
                files=["app.py"],
            ),
            CommitRecord(
                sha="def456",
                author="bob",
                message="Fix bug in auth",
                date="2026-07-02T15:00:00Z",
                total=8,
                additions=20,
                deletions=2,
                files=["auth.py"],
            ),
            CommitRecord(
                sha="ghi789",
                author="alice",
                message="Refactor login flow",
                date="2026-07-03T09:00:00Z",
                total=12,
                additions=50,
                deletions=10,
                files=["login.py"],
            ),
        ],
        authors={},
        files=[],
        analyzed_at="2026-07-03T10:00:00Z",
    )

    result: AnalyzeResult = ContributionScorer().score(analysis)
    assert result.total_commits == 3
    assert result.total_authors == 2

    alice = next(c for c in result.contributors if c.author == "alice")
    bob = next(c for c in result.contributors if c.author == "bob")

    assert alice.commits == 2
    assert alice.additions == 150
    assert alice.deletions == 15
    assert alice.active_days == 3
    assert alice.last_commit_date == "2026-07-03T09:00:00Z"
    assert alice.score > bob.score
    assert bob.bug_risk >= 1.0
