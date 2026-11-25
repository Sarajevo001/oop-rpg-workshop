"""Check current beginner source and presentation excerpts.

The punctuation scan is a limited lexical check, not a JavaScript parser.
Conceptual diagrams need not be executable.
"""
from html import unescape
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src" / "public"
sources = {}
for file in sorted((ROOT / "examples").glob("*/*/demo.js")):
    stage = file.parent.relative_to(ROOT / "examples").as_posix()
    source = file.read_text(encoding="utf-8")
    sources[stage] = source
    tokens = re.sub(
        r"//[^\n]*|/\*[\s\S]*?\*/|'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|\x60(?:\\.|[^\x60\\])*\x60",
        "",
        source,
    )
    assert "?" not in tokens, f"{stage}: unexpected conditional shorthand"
    assert not re.search(r"\$\s*\(|\b(?:const|let|function)\s+\$(?=\s|=|\()", tokens), stage

assert len(sources) == 18, "stage count"
def normalize(text):
    return re.sub(r"\s+", " ", text).strip()

appendix_count = 0
excerpt_count = 0
for deck in ("chapter0", "chapter1", "chapter2", "chapter3", "chapter4", "summary"):
    html = (ROOT / "presentations" / deck / "index.html").read_text(encoding="utf-8")
    for slide in re.findall(r'<section class="slide[^"]*"[^>]*>[\s\S]*?</section>', html):
        for stage, content in re.findall(r'<div class="feature code" data-code-source="([^"]+)">([\s\S]*?)</div>', slide):
            assert stage in sources, stage
            for line in unescape(content).splitlines():
                line = line.strip()
                if not line or line.startswith("//"):
                    continue
                assert normalize(line) in normalize(sources[stage]), f"{deck} {stage}: {line}"
            excerpt_count += 1
        for content in re.findall(r"<pre\b[^>]*><code>([\s\S]*?)</code></pre>", slide):
            stages = re.findall(r'/src/public/examples/([^"]+)/demo\.js"', slide)
            assert len(stages) == 1, f"{deck}: appendix source link"
            snippet = unescape(content).removesuffix("\n// 以下省略")
            assert normalize(snippet) in normalize(sources[stages[0]]), f"{deck} {stages[0]}: outdated appendix excerpt"
            appendix_count += 1
        assert "$('auto-friend')" not in slide, deck
assert appendix_count == 13, appendix_count
assert excerpt_count >= 13, excerpt_count
print(f"PASS: 18 readable sources, {excerpt_count} marked main excerpts, {appendix_count} contiguous appendix excerpts")
