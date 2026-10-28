# 現行教材の整合性・検証記録（2026-10-28）

## 検証原則
- 既存の確定判断を優先し、再設計を目的にしない。
- 旧記録の記述と現行実装を混同しない。
- 静的確認、DOMモック実行、実ブラウザ確認を区別する。
- 本記録の確認はGitHub mainのファイル取得による**静的確認**であり、今回新たなブラウザ実行や全段階の動的再テストを行ったという意味ではない。

## 工程1：企画書・教材の照合

| 対象 | 確定仕様との照合 | 判定 |
| --- | --- | --- |
| 第1章 | `task2/game.js`で`Slime.attack`と`FriendlySlime.attack`の両方がダメージ7、`Hero.attack`は8。確定済みの2か所変更・共通化の学習目標と一致。 | 一致 |
| 第2章 | `solution/game.js`に`team`による陣営表現、`characters`配列と陣営抽出が存在。既存の確定仕様と方向性が一致。 | 一致（静的範囲） |
| 第3章 | `task1-starter/game.js`に対象選択UI処理・`playerControl`・`cpuControl`、味方ループの`enemies()[0]` TODO、攻撃後の`updateTargetOptions()`が存在。`solution/game.js`はコンストラクタ引数`controller`を保持し`actor.controller(actor,targets)`で呼ぶ。 | 一致 |
| 第4章 | `task1`は敵の`chooseTarget`、`task2`はA/Bの`targetLeader`、`solution`は`TrackingController`と共有・独立インスタンス。2026-10-26の確定仕様と一致。 | 一致 |
| 第4章旧棚卸し | `docs/materials_audit.md`の2026-10-25欄に`AlternatingTargetController`という旧実装の記述がある。後日の企画書・現行コードでは`TrackingController`が採用済み。 | **旧記録の陳腐化**。現行コードの不具合ではない |
| 章間JS | 第2章`solution/game.js`と第3章`starter/game.js`、第3章`solution/game.js`と第4章`starter/game.js`は取得した内容が一致。 | 一致 |
| 章間HTML | 第1章`solution/index.html`→第2章`starter/index.html`、第3章`solution/index.html`→第4章`starter/index.html`は一致。第2章`solution/index.html`→第3章`starter/index.html`は不一致。 | **差分あり** |

### 章間HTML差分の詳細
第2章`solution/index.html`は`<div class="battle" id="actors">`、第3章`starter/index.html`は`<div class="battle">`。第3章のJavaScriptは`document.querySelector("#actors") || document.querySelector(".battle")`で描画先を取得するため、この差分だけで実行エラーと断定しない。旧レポートの「HTML完全一致」は現行版では成立しない。修正するなら第3章starterのHTMLに`id="actors"`を付けるだけで整合するが、実ブラウザ検証前に無断で教材を変更しない。

### 過去の判断との関係
- 第1〜4章の教育的成立性レビューは2026-10-25〜26に全章OKで確定済み。これを再審査・撤回しない。
- 第1〜4章の課題文・達成条件も2026-10-26に確定済み。
- 第3章の`task1-starter`を受講者演習開始点とする判断、攻撃後の選択肢更新を事前提供する判断も反映済み。
- 第1章の「変更箇所2か所でもよい」という判断は維持し、強い主観的負担を必須条件としない。

## 工程2：現行版の動作検証

**今回の新規実行結果：未実施。** GitHubコネクタからソースを取得して静的照合したが、ブラウザ操作やDOMモックによる現行版の実行は行っていない。過去の16段階スモークテストは後続改修前の結果であり、現行版の新規合格として転記しない。

### 次に実施する検証
1. 第0章デモ、第1〜4章の`starter/task1/task2/solution`、第3章`task1-starter`を現行版で起動する。
2. 初期描画、攻撃とHP、敵味方判定、プレイヤー／CPU切替、対象追跡・共有・独立、リセットを確認する。
3. 第4章のA/B共有・C独立は対象が偶然一致する可能性があるため、攻撃ログの一致だけでなくコントローラー参照の同一性と独立性を確認する。
4. 第3章`task1-starter`ではTODOの変更によって選択対象に攻撃が反映され、敵撃破後の選択肢が更新されることを確認する。
5. 発見した不具合のみ修正し、影響範囲を再検証する。

## 修正事項一覧
| ID | 種類 | 内容 | 現状 |
| --- | --- | --- | --- |
| M-01 | 記録 | 旧棚卸しの第4章`AlternatingTargetController`記述は現行仕様ではない | 本記録で明示。旧履歴は削除しない |
| M-02 | 章間差分 | 第2章solution→第3章starterのHTMLに`id="actors"`差分 | 静的検出。実行不良は未確認。修正未実施 |
| V-01 | 検証 | 現行全段階の動的・ブラウザ総合検証 | 未実施 |
| V-02 | 教材運用 | 第4章の共有／独立が受講者に観察できるか | 未実測 |

**現時点の判定：** 工程1の重点事項は既存確定仕様と整合。章間HTMLの差分を1件確認。工程2の新規実行結果はまだないため、総合検証完了とはしない。
