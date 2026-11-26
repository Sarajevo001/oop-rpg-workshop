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

# The opening question is the only pre-reveal theory label, apart from the
# historical book title. Keep the visual question identical at the callback.
def deck_slides(deck):
    document = (ROOT / "presentations" / deck / "index.html").read_text(encoding="utf-8")
    return re.findall(r'<section class="slide[^"]*"[^>]*>[\s\S]*?</section>', document)

def no_early_theory(slide):
    if "<h1>歴史の一場面</h1>" in slide or 'data-reveal-beat="history"' in slide:
        for book_reference in ("Design Patterns", "Design_Patterns", "『デザインパターン』"):
            slide = slide.replace(book_reference, "")
    if 'data-reveal-beat="question"' in slide:
        slide = slide.replace("<h1>依存性の注入</h1>", "")
    assert not re.search(
        r"\bDI\b|Dependency\s+Injection|依存性の注入|オブジェクト指向|デザインパターン|Design[\s_-]+Patterns|\bStrategy\b|ストラテジー|クロージャ",
        unescape(slide), re.IGNORECASE,
    ), "theory name or closure disclosed before the reveal"

for deck in ("chapter0", "chapter1", "chapter2", "chapter3", "chapter4", "summary"):
    document = (ROOT / "presentations" / deck / "index.html").read_text(encoding="utf-8")
    assert "RPGで学ぶ！プログラム改造ハンズオン" in re.search(r"<title>(.*?)</title>", document).group(1)
    assert "オブジェクト指向" not in re.search(r"<title>(.*?)</title>", document).group(1)
    if deck != "summary":
        for slide in deck_slides(deck):
            no_early_theory(slide)

intro = deck_slides("chapter0")
summary = deck_slides("summary")
assert len(intro) == 9 and len(summary) == 11
assert "<h1>RPGで学ぶ！プログラム改造ハンズオン</h1>" in intro[0]
assert 'data-reveal-beat="question"' in intro[1]
assert sum('data-reveal-beat="question"' in slide for slide in intro) == 1
for slide in summary[:2]:
    no_early_theory(slide)
assert [re.search(r'data-reveal-beat="([^"]+)"', slide).group(1) for slide in summary[:8]] == [
    "recap", "history", "mapping", "callback", "climax", "strategy-detail", "di-detail", "wisdom",
]
question = r'<div class="reveal-question">[\s\S]*?</div>'
assert re.search(question, intro[1]).group() == re.search(question, summary[3]).group()
assert "この言葉、聞いたことありますか？<br>意味、分かりますか？" in intro[1]
assert summary[0].count('class="reveal-tile"') == 4
assert "面倒くさかったから、ですよね？" in summary[0]
assert summary[1].count('class="reveal-history-card"') == 5
for reference in ("Simula 67", "Smalltalk-72", "パーナス", "Self", "Design Patterns"):
    assert reference in summary[1], reference
for chapter in range(5):
    history = next(slide for slide in deck_slides(f"chapter{chapter}") if "<h1>歴史の一場面</h1>" in slide)
    figure = re.search(r'<figure class="history-visual">[\s\S]*?</figure>', history).group()
    assert figure.replace('class="history-visual"', 'class="reveal-history-visual"') in summary[1]
assert summary[2].count('class="reveal-tile"') == 4
assert "Strategy・DI" in summary[2] and "コンポジション・DI" in summary[2]
assert "Dependency Injection / DI" in summary[3]
assert "オブジェクト指向開発ってね、<br>こういうことなんですよ。" in summary[4]
assert "<h1>デザインパターン：Strategy</h1>" in summary[5]
assert "<h1>DI：依存性の注入</h1>" in summary[6]
di_visible = summary[6].split('<aside class="speaker"')[0]
assert all(word in di_visible for word in ("第3章", "第4章", "クロージャ", "インスタンス", "外から渡す"))
assert all("クロージャ" not in slide for slide in summary[:6])
assert "<h1>オブジェクト指向は、魔法ではない</h1>" in summary[7]
wisdom_visible = summary[7].split('<aside class="speaker"')[0]
assert all(word in wisdom_visible for word in ("先人たちが失敗と工夫を積み重ねて磨いてきた、知恵の蓄積。", "銀の弾丸ではない。", "状況に応じて使いどころを考える価値がある。"))
assert "<h1>道具は、使いどころが大事</h1>" in summary[8]
assert "<h1>質疑・終了</h1>" in summary[9]
assert "<h1>自習用の確認問題</h1>" in summary[10]
print("PASS: no-silver-bullet message follows DI and precedes tool selection")
assert "『Design Patterns』刊行" in next(
    slide for slide in deck_slides("chapter4") if "<h1>歴史の一場面</h1>" in slide
)
assert sum(int(value) for slide in intro for value in re.findall(r'<aside class="speaker" hidden>(\d+)分：', slide)) + 1 == 20
assert "約1分" in next(slide for slide in intro if "<h1>歴史の一場面</h1>" in slide)
assert sum(int(value) for slide in summary for value in re.findall(r'<aside class="speaker" hidden>(\d+)分：', slide)) == 25
print("PASS: opening question, all five historical callbacks, four mappings, climax and deferred details; 20/25 minute plans")
