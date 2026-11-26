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

# The theory names belong to the reveal, not to the exercises or recap.
# The historical book title and its source link are explicitly permitted.
def deck_slides(deck):
    document = (ROOT / "presentations" / deck / "index.html").read_text(encoding="utf-8")
    return re.findall(r'<section class="slide[^"]*"[^>]*>[\s\S]*?</section>', document)

def no_early_theory(slide):
    if "<h1>歴史の一場面</h1>" in slide:
        for book_reference in ("Design Patterns", "Design_Patterns", "『デザインパターン』"):
            slide = slide.replace(book_reference, "")
    assert not re.search(
        r"\bDI\b|Dependency\s+Injection|デザインパターン|Design[\s_-]+Patterns|\bStrategy\b|ストラテジー|クロージャ",
        unescape(slide), re.IGNORECASE,
    ), "theory name or closure disclosed before the reveal"

for deck in ("chapter0", "chapter1", "chapter2", "chapter3", "chapter4"):
    for slide in deck_slides(deck):
        no_early_theory(slide)

summary = deck_slides("summary")
assert len(summary) == 11, "summary slide count"
for slide in summary[:6]:
    no_early_theory(slide)
assert "<h1>種明かし</h1>" in summary[5]
assert "<h1>デザインパターン：Strategy</h1>" in summary[6]
assert "<h1>DI：依存性の注入</h1>" in summary[7]
di_visible = summary[7].split('<aside class="speaker"')[0]
assert all(word in di_visible for word in ("第3章", "第4章", "クロージャ", "インスタンス", "外から渡す"))
assert "『Design Patterns』刊行" in next(
    slide for slide in deck_slides("chapter4") if "<h1>歴史の一場面</h1>" in slide
)
assert sum(int(value) for slide in summary for value in re.findall(r'<aside class="speaker" hidden>(\d+)分：', slide)) == 25
print("PASS: delayed Strategy/DI/closure reveal, preserved book title and 25-minute summary")
