#!/usr/bin/env python3
"""Verify GitHub Actions evidence for an exact commit (fail closed)."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

REQUIRED = frozenset(("Validate tested branch against main", "Verify chapter handoffs"))


def evaluate(runs, sha, required=REQUIRED):
    matching = [r for r in runs if r.get("head_sha") == sha and r.get("event") == "push"]
    for name in required:
        relevant = [r for r in matching if r.get("name") == name]
        if not relevant:
            return False, f"missing push run: {name}"
        # Do not accept an older successful run if a newer attempt failed.
        latest = max(relevant, key=lambda r: (r.get("created_at", ""), r.get("id", 0)))
        if latest.get("status") != "completed" or latest.get("conclusion") != "success":
            return False, f"not successful: {name}"
    return True, "required workflows succeeded for exact SHA"


def fetch_runs(repo, sha, token):
    url = f"https://api.github.com/repos/{repo}/actions/runs?head_sha={sha}&per_page=100"
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urllib.request.urlopen(req, timeout=20) as response:
        payload = json.load(response)
    if payload.get("total_count", 0) > 100:
        raise RuntimeError("Too many runs to establish complete evidence")
    return payload["workflow_runs"]


def verify(repo, sha, token):
    if not token:
        raise RuntimeError("GitHub token required for evidence verification")
    if len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
        raise ValueError("Full lowercase 40-character commit SHA required")
    ok, reason = evaluate(fetch_runs(repo, sha, token), sha)
    if not ok:
        raise RuntimeError(reason)
    print(f"PASS: {sha}: {reason}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage: verify_ci.py owner/repo tested_sha")
    try:
        verify(sys.argv[1], sys.argv[2], os.environ.get("GITHUB_TOKEN"))
    except (RuntimeError, ValueError, urllib.error.URLError, KeyError) as error:
        sys.exit(f"CI evidence rejected: {error}")
