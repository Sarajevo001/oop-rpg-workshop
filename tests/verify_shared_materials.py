"""Validate the shared RPG materials and legacy URL compatibility."""
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
BRANCH = "main"
FIDDLE = "https://jsfiddle.net/gh/get/library/pure/Sarajevo001/oop-rpg-workshop/tree/" + BRANCH + "/src/public/examples/"


LEGACY_REDIRECT = "<!doctype html>\n<html lang=\"ja\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta http-equiv=\"refresh\" content=\"0; url=demo.html\">\n  <title>教材を開く</title>\n</head>\n<body>\n  <p><a href=\"demo.html\">教材を開く</a></p>\n</body>\n</html>\n"


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
            html = (directory / "demo.html").read_text(encoding="utf-8")
            css = (directory / "demo.css").read_text(encoding="utf-8")
            details = (directory / "demo.details").read_text(encoding="utf-8")
            check(html.strip() != loader.group(0), f"{stage}: HTML body missing")
            check(bool(css.strip()), f"{stage}: CSS empty")
            check((directory / "demo.js").stat().st_size > 0, f"{stage}: JS empty")
            check(not (directory / "game.js").exists(), f"{stage}: duplicate legacy JS")
            check((directory / "index.html").read_text(encoding="utf-8") == LEGACY_REDIRECT, f"{stage}: legacy URL redirect differs")
            check(html.count(loader.group(0)) == 1, f"{stage}: loader differs")
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

    for source in PUBLIC.rglob("*"):
        if source.is_file() and source.suffix in (".html", ".js", ".css", ".details"):
            content = source.read_text(encoding="utf-8")
            if source.suffix == ".html":
                for href in re.findall(r'href="([^"]+)"', content):
                    if href.startswith("https://jsfiddle.net/gh/get/library/pure/Sarajevo001/oop-rpg-workshop/"):
                        check(href in {FIDDLE + stage + "/" for stage in STAGES}, f"{source.relative_to(ROOT)}: invalid public JSFiddle link {href}")
                    if href.startswith("https://github.com/Sarajevo001/oop-rpg-workshop/blob/") and "/src/public/examples/" in href:
                        match = re.fullmatch(r"https://github\.com/Sarajevo001/oop-rpg-workshop/blob/main/src/public/examples/(chapter\d/[\w-]+)/(demo\.(?:html|css|js|details))", href)
                        check(match is not None and match.group(1) in STAGES and (EXAMPLES / match.group(1) / match.group(2)).is_file(), f"{source.relative_to(ROOT)}: invalid public source link {href}")
            check("game.js" not in content, f"{source.relative_to(ROOT)}: obsolete JS reference")
            check(re.search(r'examples/chapter\d/[\w-]+/index\.html', content) is None, f"{source.relative_to(ROOT)}: obsolete HTML reference")

    if failures:
        for failure in failures:
            print("FAIL:", failure)
        return 1
    print("PASS: 18 stages, 72 shared files, 18 legacy redirects, no duplicate JS, download allowlist and material links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
