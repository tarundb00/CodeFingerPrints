# CodeFingerPrint

CodeFingerPrint connects a GitHub repository to a student team. Teachers run an analysis from **Contributions**, inspect the underlying activity, and download an individual PDF. Students can open their own report under **My Contributions**. Manual assessment and publication stay in the existing grading workflow.

## Run locally on Windows

Use Git, Python 3.11 or newer, Java 17 or newer, Node.js 20 or newer, and MySQL. Keep the existing database and GitHub configuration when upgrading. Run each service in its own PowerShell terminal from the project root.

**Python analyzer, port 9000**

```powershell
cd python-analyzer
# On a new checkout, create the environment first with py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 9000
```

**Spring backend, port 8080**

```powershell
cd codeFingerPrint
.\mvnw.cmd spring-boot:run
```

Spring uses the MySQL database selected by `DB_URL` and the credentials in the existing application configuration. Set `PYTHON_ANALYZER_URL` when the analyzer runs on another host. For a separately hosted browser client, set `APP_FRONTEND_ORIGIN` on Spring. Set `REACT_APP_API_BASE` and `REACT_APP_WS_URL` when building the frontend. The backend adds its analytics tables and nullable summary columns at startup.

**React frontend, port 3000**

```powershell
cd frontend
# On a new checkout, install the locked dependencies with npm.cmd ci
npm.cmd start
```

Open [the dashboard](http://localhost:3000). The default frontend proxies API calls to Spring. An existing installation needs updated Python dependencies, a restart of the analyzer and backend, and one fresh analysis. An existing student browser session may need a fresh sign-in to open private repository evidence.

## Use a project

1. In **Admin → GitHub Settings**, select an active configuration. For a private repository, the analysis token needs read access to Contents, Pull requests and Issues. Supply the repository owner and name on the project, and set each team member’s GitHub username.
2. In **Teacher → Contributions**, select the linked project and choose **Analyze now**. The previous successful report remains available if GitHub rejects the new request. The report selector includes roster members with no activity and identifies contributors outside the roster.
3. Open **Repository evidence**. Select a student and choose **Download student PDF** for the score, percentage of repository line changes, commit and PR history, ownership, and activity timeline. Students get the same automatic score and can export their own report.

For live updates, enter a public HTTPS callback ending in `/api/github/webhook` and a webhook secret in GitHub Settings. Use **Connect webhook** on the teacher’s Contributions screen. The token needs repository **Webhooks: write** for this action. A reusable callback keeps its existing subscriptions and adds pushes, pull requests, submitted reviews and issues. Alternatively, register the same URL, secret and events directly on GitHub with the JSON content type. GitHub must be able to reach the backend. A connected browser refreshes after the analysis commits to the database. Deliveries are stored, deduplicated and retried after failures. [GitHub webhook setup](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks) · [Delivery signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

## What the audit changed

| Feature | Existing implementation | Result |
| --- | --- | --- |
| Commit analysis | Branch scanning, author totals and dates | Counts each reachable commit once across branches and tags. The full history and commit frequency are visible. |
| Pull requests and reviews | Create, list, merge and close workflows | Adds per-student outcomes, reviewer identities, approval states and review history. New PRs submitted through an assigned student’s portal session retain that attribution when GitHub records the shared account. |
| Code contributions | Total added and deleted lines | Adds distinct paths touched and created, code-share percentages and a contributor ranking. |
| Issues | Local bug tracker and milestones | Adds GitHub issue creators, assignees, actual closing accounts, bug labels and elapsed resolution times. |
| Timeline | Commit-based active days | Adds daily and weekly activity, a UTC calendar, inactive days and last contribution across activity types. |
| Ownership | Python structure extraction and estimated function counts | Current-file blame attributes nonblank lines to contributors and calculates file, class and function shares. Ties can have multiple primary owners. |
| Bug introductions and fixes | Earlier edits to the same file were used to guess an author | Fix-message candidates are traced to the parent revision’s removed lines. Evidence includes the originating SHA, path, line numbers, fixer and elapsed time. An insertion-only fix can have zero candidates. |
| Contribution scoring | Different calculations in the analyzer and dashboards | The saved analyzer score and its five components drive the screens and individual PDFs. |
| Live monitoring | Webhook settings and a notification WebSocket | Adds signed delivery processing, repository matching, automatic reanalysis, and browser refresh. |
| Code quality | Python AST and complexity helpers | Adds source-located duplication, complexity, long functions, possible unused methods and a maintainability estimate. |
| Reports | Project-level exports | Adds paginated student PDFs backed by the saved analysis. |

## How to read the numbers

Each rubric component is capped at its weight. Points equal the weight multiplied by the completed fraction of the target, up to one. The targets below apply to each student independently.

| Component | Weight | Full-credit target |
| --- | ---: | --- |
| Code changes | 35 | 500 added plus deleted lines |
| Commit activity | 20 | 5 commits |
| Pull requests | 15 | 2 authored PRs |
| Code reviews | 15 | Reviews on 2 distinct PRs |
| Issue resolution | 15 | 2 resolved issues |

**Code share** uses the student’s added plus deleted lines divided by the repository total. Merge commits count as commits and carry zero line changes to avoid counting merged branches twice. A renamed path is touched and a newly added path is created. The configured branch selects the source snapshot for quality and ownership.

**Activity** counts authored commits, PR openings, merges by the merge actor, submitted reviews, issue openings and closures. An assignment alone adds a task to the assignee’s list. The observation period starts with the first recorded repository activity and ends on the analysis date. Weeks start Monday in UTC. A member with activity more than seven days ago is at risk, and more than fourteen days marks them inactive. Members without recorded activity have their own status. An unmerged closed PR is displayed as *closed unmerged*. A closed issue counts for its closing account when the closing reason indicates completion or is unspecified.

**Ownership and quality** use the eligible text files listed in the analyzer’s `git_history.py`. Python, Java, JavaScript, JSX, TypeScript, and TSX get symbol analysis. Other eligible formats get file ownership. Duplicate findings identify six matching normalized code lines. Complexity above ten and functions longer than sixty lines produce findings. A symbol mentioned only at its declaration is flagged for review, since external callers or frameworks may use it. The maintainability estimate uses token volume, nonblank line count, and estimated cyclomatic complexity. SZZ candidates and quality findings are review evidence. Neither feeds an automatic penalty into the score.

## Verification

```powershell
cd python-analyzer
.\.venv\Scripts\python.exe -m pip install pytest
.\.venv\Scripts\python.exe -m pytest -q
cd ..\codeFingerPrint
.\mvnw.cmd test
cd ..\frontend
npm.cmd test -- --watchAll=false --runInBand
npm.cmd run build
```

The Java integration tests use an isolated H2 database. The analyzer tests build a local Git repository with divergent branches and exercise GitHub collaboration records. The UI tests check the calendar, PR evidence, and the contents and pagination of a generated PDF.

## Reusable implementation prompt

> Audit the current CodeFingerPrint working tree across its React frontend, Spring Boot backend and FastAPI analyzer. Trace each of the eleven features in the audit table from its data source through storage, UI and PDF. Record what works, what is partial and what is missing. Preserve working behavior, local edits, existing records and teacher-entered marks. Implement each verified gap in this repository and connect it to the normal teacher and student workflows. Use real Git history and GitHub activity, include zero-activity roster members, and make scoring and attribution traceable. Verify branch deduplication, review-only contributors, issue closers, line-level SZZ, webhook redelivery, and the contents of a multi-page student PDF. Run the analyzer, backend and frontend tests and the production build. Deliver the updated project, run instructions, verified results, and any remaining setup that requires the repository owner.
