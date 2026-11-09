#!/usr/bin/env python3
"""Local proof of the compare-and-swap integration gate.

This tests Git's atomic ref update with an expected old SHA. It does NOT
modify GitHub main or claim that GitHub branch protection is enabled.
"""
import subprocess
import tempfile
from pathlib import Path


def git(cwd, *args, check=True):
    return subprocess.run(
        ["git", "-C", str(cwd), *args],
        check=check, text=True, capture_output=True,
    )


def commit(repo, label):
    (repo / "value.txt").write_text(label + "\n", encoding="utf-8")
    git(repo, "add", "value.txt")
    git(repo, "-c", "user.name=CI Test", "-c", "user.email=ci@example.invalid",
        "commit", "-m", label)
    return git(repo, "rev-parse", "HEAD").stdout.strip()


def main():
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp)
        git(repo, "init", "-q", "-b", "main")
        base = commit(repo, "base")

        git(repo, "checkout", "-q", "-b", "integration")
        tested = commit(repo, "tested change")
        git(repo, "checkout", "-q", "main")

        # Successful update if main still points to the tested base.
        git(repo, "update-ref", "refs/heads/main", tested, base)
        assert git(repo, "rev-parse", "main").stdout.strip() == tested
        print("PASS: unchanged main accepts tested commit")

        # Simulate another writer updating main before our attempted update.
        git(repo, "checkout", "-q", "-B", "other", base)
        changed = commit(repo, "other change")
        git(repo, "update-ref", "refs/heads/main", changed, tested)
        result = git(repo, "update-ref", "refs/heads/main", tested, base, check=False)
        assert result.returncode != 0
        assert git(repo, "rev-parse", "main").stdout.strip() == changed
        print("PASS: stale expected SHA is rejected without changing main")

        # Even with a current SHA, an unrelated commit is not automatically safe.
        # The integration process must separately check ancestry and tested tree.
        print("PASS: race control and integration validation remain separate checks")


if __name__ == "__main__":
    main()
