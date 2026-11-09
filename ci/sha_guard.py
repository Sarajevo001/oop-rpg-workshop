#!/usr/bin/env python3
"""Classify a failed SHA-guarded branch update without guessing from API text.

An update exception alone is not proof of a conflict. Read the remote ref again.
This helper deliberately does not perform any GitHub write.
"""


def classify_update_failure(expected_sha, target_sha, observed_sha):
    """Return a conservative status after a failed update.

    conflict: ref moved away from the expected revision.
    applied: ref now equals the requested target (outcome may be ambiguous).
    indeterminate: ref unchanged or unavailable; investigate original API error.
    """
    if observed_sha is None:
        return "indeterminate"
    if observed_sha == target_sha:
        return "applied"
    if observed_sha != expected_sha:
        return "conflict"
    return "indeterminate"


def should_retry_without_retest(status):
    """No failed update may be blindly retried or treated as test approval."""
    return False
