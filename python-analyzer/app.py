import os
import subprocess

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from github import GithubException

from services.github_client import GitHubClient
from services.models import AnalyzeRequest, AnalyzeResult
from services.scoring import WeightedContributionScorer

app = FastAPI(title="CodeFingerPrint contribution analyzer")
app.add_middleware(CORSMiddleware,
                   allow_origins=os.getenv("ANALYZER_FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.post("/analyze/project", response_model=AnalyzeResult)
def analyze_project(payload: AnalyzeRequest, authorization: str | None = Header(default=None)):
    bearer = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
    gh = GitHubClient(token=bearer or payload.token or os.getenv("GITHUB_PAT"))
    try:
        repo = gh.get_repo(payload.owner, payload.repo)
        analysis = gh.analyze_repo(repo, branch=payload.branch, students=payload.students)
        analysis.portal_pull_authors = payload.portal_pull_authors
        return WeightedContributionScorer().score(analysis)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except GithubException as exc:
        detail = (exc.data or {}).get("message", "Repository request failed") if isinstance(exc.data, dict) else "Repository request failed"
        if exc.status in (403, 429) and 'rate limit' in detail.lower():
            raise HTTPException(429, "GitHub API rate limit reached. Retry after the limit resets or configure an authenticated token.") from exc
        raise HTTPException(502, f"GitHub HTTP {exc.status}: {detail}") from exc
    except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
        raise HTTPException(502, "Git could not read the repository history. Check Git, the branch, network and token permissions.") from exc
    finally:
        gh.client.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "CodeFingerPrint Advanced Analyzer"}
