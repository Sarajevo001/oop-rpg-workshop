"""Validate the shared RPG material migration against its retained baseline."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "src" / "public"
EXAMPLES = PUBLIC / "examples"
STAGES = (
    "chapter0/demo",
    "chapter1/starter",
    "chapter1/task1",
    "chapter1/task2",
    "chapter1/solution",
    "chapter2/starter",
    "chapter2/task1",
    "chapter2/task2",
    "chapter2/solution",
    "chapter3/starter",
    "chapter3/task1-starter",
    "chapter3/task1",
    "chapter3/task2",
    "chapter3/solution",
    "chapter4/starter",
    "chapter4/task1",
    "chapter4/task2",
    "chapter4/solution",
)
FILES = ("demo.html", "demo.css", "demo.js", "demo.details")
BRANCH = "feature-jsfiddle-chapter1-starter"
FIDDLE = "https://jsfiddle.net/gh/get/library/pure/Sarajevo001/oop-rpg-workshop/tree/" + BRANCH + "/src/public/examples/"


def normalize(source: str) -> str:
    return "\n".join(line.lstrip() for line in source.strip().splitlines())


def main() -> int:
    failures = []
    loader = re.search(r"<script>[\s\S]*?</script>", (EXAMPLES / "chapter1/starter/demo.html").read_text(encoding="utf-8"))
    if loader is None:
        print("FAIL: shared loader missing")
        return 1

    def check(condition, message):
        if not condition:
            failures.append(message)

    index = (PUBLIC / "index.html").read_text(encoding="utf-8")
    download = (EXAMPLES / "download.js").read_text(encoding="utf-8")
    allowlist = re.search(r"const supportedStages = \[([\s\S]*?)\];", download)
    check(allowlist is not None and tuple(re.findall(r"'([^']+)'", allowlist.group(1))) == STAGES, "download allowlist mismatch")
    check("supportedStages.includes(stage) === false" in download, "download rejection missing")
    for stage in STAGES:
        directory = EXAMPLES / stage
        try:
            for name in FILES:
                check((directory / name).is_file(), f"{stage}: {name} missing")
            old = (directory / "index.html").read_text(encoding="utf-8")
            html = (directory / "demo.html").read_text(encoding="utf-8")
            css = (directory / "demo.css").read_text(encoding="utf-8")
            details = (directory / "demo.details").read_text(encoding="utf-8")
            body = re.search(r"<body>([\s\S]*?)</body>", old)
            style = re.search(r"<style>([\s\S]*?)</style>", old)
            check(body is not None and normalize(re.sub(r'<script src="game\.js"></script>', "", body.group(1))) == normalize(html.replace(loader.group(0), "")), f"{stage}: HTML body differs")
            check(style is not None and normalize(style.group(1)) == normalize(css), f"{stage}: CSS differs")
            check(html.count(loader.group(0)) == 1, f"{stage}: loader differs")
            check((directory / "demo.js").read_bytes() == (directory / "game.js").read_bytes(), f"{stage}: JS differs")
            check(re.fullmatch(r"/\*\n---\nname: [^\n]+\ndescription: [^\n]+\n\.\.\.\n\*/\n?", details) is not None, f"{stage}: metadata invalid")
            for href in (f"./examples/{stage}/demo.html", FIDDLE + stage + "/", f"./examples/download.html?stage={stage}"):
                check(index.count(f'href="{href}"') == 1, f"{stage}: index link missing or duplicated: {href}")
        except OSError as exc:
            failures.append(f"{stage}: {exc}")

    for chapter in range(5):
        presentation = (PUBLIC / "presentations" / f"chapter{chapter}" / "index.html").read_text(encoding="utf-8")
        check("game.js" not in presentation, f"chapter{chapter}: old JS reference")
        check(re.search(r'href="\.\./\.\./examples/chapter\d/[\w-]+/"', presentation) is None, f"chapter{chapter}: old launch link")
        for stage in re.findall(r'href="\.\./\.\./examples/(chapter\d/[\w-]+)/demo\.html"', presentation):
            check(stage in STAGES, f"chapter{chapter}: invalid stage {stage}")
            check(FIDDLE + stage + "/" in presentation, f"chapter{chapter}: missing JSFiddle link {stage}")
            check(f"../../examples/download.html?stage={stage}" in presentation, f"chapter{chapter}: missing download link {stage}")

    if failures:
        for failure in failures:
            print("FAIL:", failure)
        return 1
    print("PASS: 18 stages, 72 shared files, baseline equality, download allowlist and material links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
