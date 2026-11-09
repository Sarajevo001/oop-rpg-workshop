#!/usr/bin/env python3
"""Guarded fast-forward integration. Dry-run by default.

Requires a checkout with full history and an authenticated 'origin' remote.
No force pushes. The caller must independently verify CI for tested_sha.
"""
import argparse
import os
import subprocess
import sys

from sha_guard import classify_update_failure
from verify_ci import verify


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=check)


def remote_head():
    result = git("ls-remote", "--heads", "origin", "main")
    lines = result.stdout.strip().splitlines()
    if len(lines) != 1:
        raise RuntimeError("Cannot resolve unique origin/main")
    return lines[0].split()[0]


def run(expected_main, tested_sha, apply):
    if not expected_main or not tested_sha or expected_main == tested_sha:
        raise ValueError("Distinct expected main and tested commit SHA required")
    for sha in (expected_main, tested_sha):
        if len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
            raise ValueError("Full lowercase 40-character commit SHA required")

    # Fetch exact objects and check that the tested commit descends from the
    # expected main. This excludes non-fast-forward integration.
    git("fetch", "--no-tags", "origin", "main")
    git("cat-file", "-e", expected_main + "^{commit}")
    git("cat-file", "-e", tested_sha + "^{commit}")
    ancestor = git("merge-base", "--is-ancestor", expected_main, tested_sha, check=False)
    if ancestor.returncode != 0:
        raise RuntimeError("Tested commit does not descend from expected main")

    observed = remote_head()
    if observed != expected_main:
        raise RuntimeError(f"CONFLICT: main moved from {expected_main} to {observed}")
    print(f"Ready: main={expected_main}, tested={tested_sha}")
    if not apply:
        print("DRY RUN: no branch updated")
        return

    # Recheck the exact tested SHA against successful GitHub Actions runs.
    repo = os.environ.get("GITHUB_REPOSITORY")
    token = os.environ.get("GITHUB_TOKEN")
    if not repo or not token:
        raise RuntimeError("GITHUB_REPOSITORY and GITHUB_TOKEN required for apply")
    verify(repo, tested_sha, token)

    # Normal push is non-forced and GitHub rejects non-fast-forward races.
    # Re-check the remote after any error. Never automatically retry.
    result = git("push", "origin", f"{tested_sha}:refs/heads/main", check=False)
    after = remote_head()
    if result.returncode != 0:
        status = classify_update_failure(expected_main, tested_sha, after)
        raise RuntimeError(f"Push failed; classification={status}; observed={after}; {result.stderr.strip()}")
    if after != tested_sha:
        raise RuntimeError(f"Push returned success but main={after}; investigate")
    print(f"APPLIED: main={after}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-main", required=True)
    parser.add_argument("--tested-sha", required=True)
    parser.add_argument("--apply", action="store_true", help="Actually update main")
    args = parser.parse_args()
    try:
        run(args.expected_main, args.tested_sha, args.apply)
    except (RuntimeError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
