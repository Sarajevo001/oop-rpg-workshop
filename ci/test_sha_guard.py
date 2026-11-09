#!/usr/bin/env python3
"""Unit checks for conservative post-error branch SHA classification."""
import unittest
from sha_guard import classify_update_failure, should_retry_without_retest


class ShaGuardTests(unittest.TestCase):
    def test_moved_ref_is_conflict(self):
        self.assertEqual(classify_update_failure("old", "target", "other"), "conflict")

    def test_target_is_present(self):
        self.assertEqual(classify_update_failure("old", "target", "target"), "applied")

    def test_unchanged_ref_is_indeterminate(self):
        self.assertEqual(classify_update_failure("old", "target", "old"), "indeterminate")

    def test_unavailable_ref_is_indeterminate(self):
        self.assertEqual(classify_update_failure("old", "target", None), "indeterminate")

    def test_no_blind_retry(self):
        for status in ("conflict", "applied", "indeterminate"):
            self.assertFalse(should_retry_without_retest(status))


if __name__ == "__main__":
    unittest.main()
