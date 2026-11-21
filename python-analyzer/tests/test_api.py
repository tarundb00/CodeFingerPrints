"""Exercise the HTTP entry point, a real bare clone and paginated GitHub REST responses."""
import json
import socket
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests
import uvicorn
from github import Github

import app as analyzer
from services import github_client


@pytest.fixture
def analyzer_url():
    listener = socket.socket()
    listener.bind(('127.0.0.1', 0))
    address = 'http://127.0.0.1:' + str(listener.getsockname()[1])
    server = uvicorn.Server(uvicorn.Config(analyzer.app, log_level='error', lifespan='off'))
    worker = threading.Thread(target=server.run, kwargs={'sockets': [listener]}, daemon=True)
    worker.start()
    try:
        for _ in range(200):
            if server.started:
                break
            time.sleep(0.01)
        assert server.started
        yield address
    finally:
        server.should_exit = True
        worker.join(timeout=5)
        listener.close()


def test_http_analysis_collects_pages_and_returns_utc_evidence(tmp_path, monkeypatch, analyzer_url):
    source = tmp_path / 'demo'
    subprocess.run(['git', 'init', '-q', '-b', 'main', str(source)], check=True)
    (source / 'demo.py').write_text('def greet():\n    return "Hello"\n')
    subprocess.run(['git', '-C', str(source), 'add', '.'], check=True)
    subprocess.run(['git', '-C', str(source), '-c', 'user.name=Alice', '-c', 'user.email=a@example.test',
                    '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Add greeting'], check=True)
    sha = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    date = '2026-06-01T12:00:00Z'
    api = ThreadingHTTPServer(('127.0.0.1', 0), BaseHTTPRequestHandler)
    base = 'http://127.0.0.1:' + str(api.server_port)
    repo_path = '/repos/class/demo'
    repo_url = base + repo_path
    alice, bob = {'login': 'alice'}, {'login': 'bob'}
    opened = {'number': 1, 'title': 'Greeting', 'url': repo_url + '/pulls/1', 'user': alice, 'state': 'open',
              'created_at': date, 'merged_at': None, 'closed_at': None}
    closed = {**opened, 'number': 2, 'url': repo_url + '/pulls/2', 'state': 'closed', 'closed_at': date}
    issue = {'number': 3, 'url': repo_url + '/issues/3', 'title': 'Error', 'user': alice, 'state': 'closed',
             'created_at': date, 'closed_at': '2026-06-02T12:00:00Z', 'closed_by': bob,
             'state_reason': 'completed', 'assignees': [bob], 'labels': [{'name': 'bug'}]}
    responses = {
        repo_path: {'url': repo_url, 'full_name': 'class/demo', 'name': 'demo', 'owner': {'login': 'class'},
                    'default_branch': 'main', 'has_issues': True},
        repo_path + '/commits/' + sha: {'author': alice, 'sha': sha},
        repo_path + '/pulls': [opened], repo_path + '/pulls/1': opened, repo_path + '/pulls/2': closed,
        repo_path + '/pulls/1/reviews': [{'id': 4, 'user': bob, 'state': 'APPROVED', 'submitted_at': date}],
        repo_path + '/pulls/2/reviews': [],
        repo_path + '/issues': [{'number': 1, 'pull_request': {'url': opened['url']}}, issue],
        repo_path + '/issues/3': issue,
    }

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = self.path.split('?')[0]
            value = responses.get(path)
            self.send_response(200 if value is not None else 404)
            self.send_header('Content-Type', 'application/json')
            if path == repo_path + '/pulls':
                if 'page=2&' in self.path or self.path.endswith('page=2'):
                    value = [closed]
                else:
                    self.send_header('Link', '<' + repo_url + '/pulls?page=2>; rel="next"')
            self.end_headers()
            self.wfile.write(json.dumps(value).encode())

        def log_message(self, *args):
            pass

    api.RequestHandlerClass = Handler
    worker = threading.Thread(target=api.serve_forever, daemon=True)
    worker.start()

    class LocalGitHub(github_client.GitHubClient):
        def __init__(self, token=None):
            self.token = token
            self.client = Github(base_url=base, per_page=100, retry=0)

    def clone(full_name, token, destination):
        assert full_name == 'class/demo'
        subprocess.run(['git', 'clone', '--quiet', '--bare', str(source), str(destination)], check=True)

    monkeypatch.setattr(analyzer, 'GitHubClient', LocalGitHub)
    monkeypatch.setattr(github_client, 'clone_repository', clone)
    try:
        assert requests.get(analyzer_url + '/health', timeout=5).ok
        response = requests.post(analyzer_url + '/analyze/project', timeout=30, json={
            'repo': 'class/demo', 'students': [{'usn': 'A1', 'login': 'alice'}, {'usn': 'B2', 'login': 'bob'}],
            'portal_pull_authors': {'2': 'B2'},
        })
        assert response.status_code == 200, response.text
        result = response.json()
        rows = {r['usn']: r for r in result['contributors']}
        assert result['total_commits'] == 1
        assert len(rows['A1']['files_created']) == rows['A1']['pull_requests'] == rows['A1']['issues_created'] == 1
        assert rows['B2']['pr_history'][0]['github_author'] == 'alice'
        assert rows['B2']['rejected'] == rows['B2']['approvals'] == rows['B2']['bugs_resolved'] == 1
        assert rows['B2']['mean_bug_resolution_hours'] == 24
        assert rows['A1']['ownership'][1]['name'] == 'greet'
    finally:
        api.shutdown()
        api.server_close()
        worker.join(timeout=2)
