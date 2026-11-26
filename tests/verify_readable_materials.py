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
    assert not re.search(r"return\s+(?:target\s+instanceof|target\s+===\s+enemySlime|this\.team\s+!==\s+target\.team)", tokens), stage
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
        for stage, content in re.findall(r'<div class="feature code" data-code-source="([^"]+)"[^>]*>([\s\S]*?)</div>', slide):
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

# The chapter 4 problem and solution must expose the actual complete methods.
chapter4 = (ROOT / "presentations" / "chapter4" / "index.html").read_text(encoding="utf-8")
for stage, marker, pattern in (
    ("chapter4/task2", "irritation-sticker", r"  chooseTarget\(targets\) \{[\s\S]*?\n  \}"),
    ("chapter4/solution", "attention-sticker", r"class TrackingController \{[\s\S]*?\n\}"),
):
    expected = re.search(pattern, sources[stage]).group()
    slide = next(s for s in re.findall(r'<section class="slide[^"]*"[^>]*>[\s\S]*?</section>', chapter4) if f'role-sticker {marker}' in s)
    assert normalize(expected) in normalize(unescape(slide)), stage

# Each task 1 example must contain its core implementation, not just names
# or a placeholder for the behavior that the exercise implements.
for deck, patterns in (
    ("chapter1", (
        r"class FriendlySlime \{[\s\S]*?\n\}",
        r"  friendlySlime = new FriendlySlime\([^\n]+",
        r"  if \(enemySlime\.hp > 0\) \{\n    showMessage\(friendlySlime\.attack\(enemySlime\)\);\n  \}",
    )),
    ("chapter2", (
        r"  canAttack\(target\) \{[\s\S]*?\n  \}",
        r"    if \(this\.canAttack\(target\) === false\) \{[\s\S]*?\n    \}",
    )),
    ("chapter3", (
        r"  if \(friend\.hp > 0 && enemies\(\)\.length > 0\) \{[\s\S]*?\n  \}",
    )),
    ("chapter4", (
        r"    this\.lockedTarget = null;",
        r"  chooseTarget\(targets\) \{[\s\S]*?\n  \}",
    )),
):
    stage = f"{deck}/task1"
    html = (ROOT / "presentations" / deck / "index.html").read_text(encoding="utf-8")
    slide = next(
        item for item in re.findall(r'<section class="slide[^"]*"[^>]*>[\s\S]*?</section>', html)
        if re.search(r"<h1>課題1：実装例(?:を確認)?</h1>", item)
    )
    blocks = re.findall(r'<div class="feature code" data-code-source="([^"]+)"[^>]*>([\s\S]*?)</div>', slide)
    excerpts = [normalize(unescape(content)) for source, content in blocks if source == stage]
    for pattern in patterns:
        expected = normalize(re.search(pattern, sources[stage]).group())
        assert any(expected in excerpt for excerpt in excerpts), f"{stage}: core example missing: {expected}"
print("PASS: four task 1 slides contain complete core implementation excerpts")
