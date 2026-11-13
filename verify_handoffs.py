"""Check chapter solution -> next starter continuity.

Run: python3 verify_handoffs.py
Only the HTML <title> text may differ across a handoff.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
PAIRS = ((1, 2), (2, 3), (3, 4))
TITLE = re.compile(r"<title>[^<]*</title>")


def normalized_html(source: str) -> str:
    titles = TITLE.findall(source)
    if len(titles) != 1:
        raise ValueError(f"Expected exactly one HTML title, found {len(titles)}")
    return TITLE.sub("<title>__CHAPTER_TITLE__</title>", source)


def main() -> int:
    failures = []
    for previous, following in PAIRS:
        left = ROOT / "src" / "public" / "examples" / f"chapter{previous}" / "solution"
        right = ROOT / "src" / "public" / "examples" / f"chapter{following}" / "starter"
        for name in ("game.js", "index.html"):
            try:
                a = (left / name).read_text(encoding="utf-8")
                b = (right / name).read_text(encoding="utf-8")
                if name == "index.html":
                    a, b = normalized_html(a), normalized_html(b)
                if a != b:
                    failures.append(f"Chapter {previous} -> {following}: {name} differs")
            except (OSError, ValueError) as exc:
                failures.append(f"Chapter {previous} -> {following}: {name}: {exc}")
    if failures:
        print("Handoff verification FAILED:")
        for issue in failures:
            print(" -", issue)
        return 1
    print("Handoff verification passed: 3 JS pairs identical; 3 HTML pairs identical except <title>.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
