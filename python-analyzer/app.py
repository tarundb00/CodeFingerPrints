from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from services.github_client import GitHubClient
from services.scoring import WeightedContributionScorer
from services.models import AnalyzeResult
import os

app = FastAPI(title="CodeFingerPrint Advanced Code Intelligence Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzePayload(BaseModel):
    owner: Optional[str] = None
    repo: str
    branch: Optional[str] = None
    token: Optional[str] = None


@app.post("/analyze/project", response_model=AnalyzeResult)
async def analyze_project(payload: AnalyzePayload):
    """
    Analyzes project repository using:
    - Authorship Attribution (Code Stylometry + CLAVE + SVM)
    - SZZ Bug Tracking (PySZZ v2)
    - AI Code Detection (GraphCodeBERT + Contrastive Learning)
    - AST Parsing & Call Graph Analysis
    - Weighted Scoring Model
    """
    token = payload.token or os.getenv("GITHUB_PAT")
    gh = GitHubClient(token=token)
    try:
        repo = gh.get_repo(payload.owner, payload.repo)
        analysis = gh.analyze_repo(repo, branch=payload.branch)
        result = WeightedContributionScorer().score(analysis)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "CodeFingerPrint Advanced Analyzer"}
