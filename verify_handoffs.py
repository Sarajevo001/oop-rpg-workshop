"""Check chapter solution -> next starter continuity.

Run: python3 verify_handoffs.py
The shared HTML, CSS and JS must be identical across a handoff.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
PAIRS = ((1, 2), (2, 3), (3, 4))
def main() -> int:
    failures = []
    for previous, following in PAIRS:
        left = ROOT / "src" / "public" / "examples" / f"chapter{previous}" / "solution"
        right = ROOT / "src" / "public" / "examples" / f"chapter{following}" / "starter"
        for name in ("demo.js", "demo.html", "demo.css"):
            try:
                a = (left / name).read_text(encoding="utf-8")
                b = (right / name).read_text(encoding="utf-8")
                if a != b:
                    failures.append(f"Chapter {previous} -> {following}: {name} differs")
            except (OSError, ValueError) as exc:
                failures.append(f"Chapter {previous} -> {following}: {name}: {exc}")
    if failures:
        print("Handoff verification FAILED:")
        for issue in failures:
            print(" -", issue)
        return 1
    print("Handoff verification passed: 3 JS, 3 HTML and 3 CSS pairs identical.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
