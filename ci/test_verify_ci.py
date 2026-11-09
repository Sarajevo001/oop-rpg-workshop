#!/usr/bin/env python3
import unittest
from verify_ci import evaluate

SHA = "a" * 40
OTHER = "b" * 40
NAMES = ("Validate tested branch against main", "Verify chapter handoffs")


def run(name, sha=SHA, status="completed", conclusion="success", event="push", id=1):
    return {"name": name, "head_sha": sha, "status": status,
            "conclusion": conclusion, "event": event,
            "created_at": "2026-11-09T00:00:00Z", "id": id}


class EvidenceTests(unittest.TestCase):
    def test_all_success(self):
        self.assertTrue(evaluate([run(n) for n in NAMES], SHA)[0])

    def test_missing(self):
        self.assertFalse(evaluate([run(NAMES[0])], SHA)[0])

    def test_wrong_sha(self):
        self.assertFalse(evaluate([run(n, OTHER) for n in NAMES], SHA)[0])

    def test_failure_and_pending(self):
        for status, conclusion in (("completed", "failure"), ("in_progress", None)):
            self.assertFalse(evaluate([run(NAMES[0]), run(NAMES[1], status=status, conclusion=conclusion)], SHA)[0])

    def test_pull_request_is_not_push(self):
        self.assertFalse(evaluate([run(n, event="pull_request") for n in NAMES], SHA)[0])

    def test_latest_failure_overrides_older_success(self):
        runs = [run(n) for n in NAMES] + [run(NAMES[0], conclusion="failure", id=2)]
        self.assertFalse(evaluate(runs, SHA)[0])


if __name__ == "__main__":
    unittest.main()
