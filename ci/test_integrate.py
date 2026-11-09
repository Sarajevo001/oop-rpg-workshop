#!/usr/bin/env python3
"""No-network tests for the manual integration entry point."""
import unittest
from unittest.mock import patch
import integrate


class IntegrationTests(unittest.TestCase):
    @patch("integrate.git")
    def test_dry_run_does_not_push(self, mock_git):
        mock_git.return_value.returncode = 0
        with patch("integrate.remote_head", return_value="a" * 40):
            integrate.run("a" * 40, "b" * 40, False)
        self.assertFalse(any(call.args and call.args[0] == "push" for call in mock_git.call_args_list))

    @patch("integrate.git")
    def test_changed_main_rejected_before_push(self, mock_git):
        mock_git.return_value.returncode = 0
        with patch("integrate.remote_head", return_value="c" * 40):
            with self.assertRaisesRegex(RuntimeError, "CONFLICT"):
                integrate.run("a" * 40, "b" * 40, True)
        self.assertFalse(any(call.args and call.args[0] == "push" for call in mock_git.call_args_list))

    @patch("integrate.git")
    def test_unrelated_commit_rejected(self, mock_git):
        mock_git.return_value.returncode = 1
        with self.assertRaisesRegex(RuntimeError, "does not descend"):
            integrate.run("a" * 40, "b" * 40, True)
        self.assertFalse(any(call.args and call.args[0] == "push" for call in mock_git.call_args_list))

    @patch("integrate.git")
    def test_failed_push_classified_by_reread(self, mock_git):
        mock_git.return_value.returncode = 0
        mock_git.return_value.stderr = "rejected"
        def fake_git(*args, **kwargs):
            result = unittest.mock.Mock(returncode=1 if args[0] == "push" else 0, stderr="rejected")
            return result
        mock_git.side_effect = fake_git
        with patch("integrate.remote_head", side_effect=["a" * 40, "c" * 40]):
            with self.assertRaisesRegex(RuntimeError, "classification=conflict"):
                integrate.run("a" * 40, "b" * 40, True)


if __name__ == "__main__":
    unittest.main()
