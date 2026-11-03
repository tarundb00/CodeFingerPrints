# Python Analyzer for CodeFingerPrint

This microservice performs GitHub contribution analysis and scoring separately from the Java backend.

## Architecture

- `app.py` - FastAPI server exposing the analysis endpoint
- `services/github_client.py` - GitHub ingestion using PyGithub
- `services/models.py` - Pydantic models for analysis input/output
- `services/scoring.py` - Contribution scoring and alert generation

## Algorithms & modules

| Module | Purpose | Key Python Libraries |
|---|---|---|
| GitHub Integration | Fetch commits, repo tree, file contents | `PyGithub`, `requests` |
| Contribution Scoring | Compute contribution score, active days, bug/AI risk | `pandas` (optional), custom logic |
| Bug Risk | Detect fix-like commit messages | custom keyword logic |
| AI Risk | Detect AI-related commit markers | keyword search, future ML classifier |
| REST API | Expose analysis service to Java frontend | `FastAPI`, `uvicorn` |

## Run locally

1. Create venv

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set GitHub token

```powershell
# For private repos set GITHUB_PAT or pass token in request payload
$env:GITHUB_PAT = "ghp_xxx"
```

3. Start server

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 9000
```

4. Call analyze endpoint

```bash
curl -X POST http://localhost:9000/analyze/project \
  -H "Content-Type: application/json" \
  -d '{"owner":"myorg","repo":"myrepo"}'
```
