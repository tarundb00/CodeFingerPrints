# Python analyzer

The FastAPI service reads a temporary bare Git clone for commit history, per-file changes and line attribution. PyGithub supplies GitHub identities, PRs, reviews and issues. The service returns the contribution report to Spring, which stores it alongside existing grades.

## Start the analyzer

Run in PowerShell from this directory. Git must be on PATH.

```powershell
# For the first run
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# For subsequent runs
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --host 127.0.0.1 --port 9000
```

Open [the health endpoint](http://127.0.0.1:9000/health) or [the API schema](http://127.0.0.1:9000/docs). The Spring backend sends the active GitHub token in the Authorization header. A direct caller can also set `GITHUB_PAT` for the analyzer process. Use the project’s existing listening address when running the services on separate hosts.

## Analyze a repository

```powershell
$payload = @{
    owner = "YOUR_OWNER"
    repo = "YOUR_REPOSITORY"
    students = @(@{usn = "S1"; login = "GITHUB_USERNAME"})
} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:9000/analyze/project -ContentType application/json -Body $payload
```

The optional branch chooses the source snapshot. The response contains the observation period, contributor rows, score components, GitHub histories, line ownership, SZZ evidence and quality findings. Reading an inaccessible branch or repository fails the run so Spring can retain the last successful snapshot.

See the [project instructions, scoring rubric and webhook setup](../README.md).
