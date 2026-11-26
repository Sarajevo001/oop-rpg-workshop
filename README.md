# RPGで学ぶオブジェクト指向

JavaScriptの基礎を学んだ人向けの、RPGを使ったオブジェクト指向ハンズオン教材です。

## 現行教材

- [第0章〜第4章のコード](src/public/examples/)
- [企画・設計記録](docs/oop_rpg_workshop_plan.md)
- [現行仕様・進捗（教材棚卸し）](docs/materials_audit.md)
- [総合ロジック検証](docs/integration_validation_report.md)

第1〜4章は `starter`（開始）、`task1`（最初の追加要求）、`task2`（次の追加要求）、`solution`（改善例）の順に参照します。第0章は講師用デモです。共通教材化・公開検証は2026-11-25完了。2026-11-27、作成者による全編確認を経て教材制作はいったん完成。開催準備・未確認事項は [教材棚卸しの最新記録](docs/materials_audit.md) を参照。公開サイト: https://demo.sarajevo.jp/oop-rpg-workshop/ 。

## プレゼンテーションの配置

発表用のHTMLプレゼンテーションは `src/public/presentations/` に配置する。各章は独立したHTMLファイルで、ブラウザから表示する。

| 区分 | HTMLファイル |
| --- | --- |
| 第0章 | [chapter0/index.html](src/public/presentations/chapter0/index.html) |
| 第1章 | [chapter1/index.html](src/public/presentations/chapter1/index.html) |
| 第2章 | [chapter2/index.html](src/public/presentations/chapter2/index.html) |
| 第3章 | [chapter3/index.html](src/public/presentations/chapter3/index.html) |
| 第4章 | [chapter4/index.html](src/public/presentations/chapter4/index.html) |
| まとめ・種明かし | [summary/index.html](src/public/presentations/summary/index.html) |

- 講義スライドの入口は [src/public/index.html](src/public/index.html)。各章のコード閲覧・デモ・JSFiddle・ダウンロードは [src/public/materials.html](src/public/materials.html) に分離する。
- 章別の発表用HTMLと、演習・実演用コード `src/public/examples/` は別の成果物として管理する。
- プレゼン資料を編集する際は、対象章のHTMLを確認し、既存のページ送り・講師メモ・参考資料を含む構成を維持する。構成・演出の基準は [企画・設計記録](docs/oop_rpg_workshop_plan.md) とプレゼン工房の制作ガイドラインを参照する。

## 開発規約

本プロジェクトは、[XO-Code Busters](https://github.com/Sarajevo001/xo-code-busters) で管理する共通システム開発標準、JavaScriptコーディング規約、標準管理規程および関連する運用・CI標準を正式採用する。

採用規約のID、バージョン、参照コミットは、リポジトリルートの [standards-reference.json](standards-reference.json) を正本として管理する。規約本文は本リポジトリに複製しない。

コードの作成・変更・レビューを開始する際は、採用参照情報を確認し、指定されたコミットの規約本文を取得して、規約ID・バージョンとの一致を確認する。参照不能や不一致がある場合は、影響する作業を停止して報告する。

適用対象は本プロジェクト全体の新規成果物および既存成果物の新規・変更部分とする。既存未変更部分への一律遡及適用は行わない。適用対象の判定は、採用規約の適用条件に従う。

規約の改訂は自動採用しない。改訂内容と本プロジェクトへの影響を評価し、ユーザーの明示承認を得た後に採用版を更新する。必要なソースコード修正は別途判断する。

### 開発規約の更新確認と採用手続き

開発規約を適用する作業（コードレビュー、コード生成、コード修正など）を開始する際は、次の手順を必ず実行する。

1. `standards-reference.json` から各規約の現在の正式採用版（規約ID、バージョン、参照コミット）を取得する。
2. XO-Code Bustersの規約管理元から、各規約の最新版と規約本文を取得する。正式採用版の規約本文も指定コミットから取得する。
3. 規約ID、バージョン、規約本文を比較し、未採用の追加・変更の有無を確認する。
4. 未採用の変更が存在する場合は、変更内容と本プロジェクトへの影響をユーザーに報告する。
5. 未採用の変更が検出された場合は、必ずユーザーに採用可否を質問し、回答を待つ。採用・不採用・保留の判断が確定するまで、影響する通常作業を続行しない。
6. ユーザーが採用を明示承認した場合に限り、`standards-reference.json` の該当規約の採用情報を更新する。不採用の場合は既存の採用版を維持し、保留の場合は影響する作業を停止する。
7. 採用版が確定した後、その版の規約本文を使用して作業を続行する。

**必須条件**

- 未採用の変更が検出された場合、採用確認を省略して通常作業を続行してはならない。
- 変更の検出・報告だけでは、採用確認を完了したものとみなさない。
- ユーザーの明示承認なしに採用版を更新してはならない。
- 最新版または正式採用版の取得に失敗した場合、確認済みと報告してはならない。取得失敗と判定不能な範囲を報告し、影響する作業の継続可否をユーザーに確認する。
- 未採用の変更がない場合は、既存の採用版で作業を続行してよい。
- 規約の採用承認は、ソースコード修正の承認を意味しない。必要な修正は別途判断する。

この手順は、コードレビュー、コード生成、コード修正など、開発規約を適用する作業に共通して適用する。

レビュー時は適用対象の規約IDごとに、遵守・違反・対象外・判定不能を根拠とともに記録する。

## プレゼン資料の制作規約

スライドの企画・構成・演出・レビューには、[プレゼン工房 制作ガイドライン（GitHub正本）](https://github.com/Sarajevo001/presentation-workshop/blob/main/guidelines/presentation_workshop_guidelines.md) の最新版を適用する。作業開始時にGitHubから内容と版を確認し、取得できない場合は未確認であることを報告する。旧ChatGPTプロジェクト情報源のv1.0は参照しない。

RPG固有の教材設計、演習の順序、解決策を提示するタイミングは [企画・設計記録](docs/oop_rpg_workshop_plan.md) に従う。特に「課題1で自然な実装 → 課題2で変更負担を体験 → 改善例を提示」の流れを保つ。スライドは発表者の説明の流れで統合・分割し、機械的な「概要＋詳細」の重複を避ける。

**規約の役割分担**：プレゼン工房は発表資料の制作規約、XO-Code Bustersはシステム開発・JavaScript・CI等の開発規約を管理する。開発規約の正式採用版は引き続き [standards-reference.json](standards-reference.json) を正本とし、プレゼン工房の規約更新によって自動変更しない。

## 旧版の保管

[archive/](archive/) に旧企画（v0.3等）で作成した `exercises/`、`prototype/`、旧監査記録を保存しています。**現行の配布コードではありません。**

旧版は設計変更の比較・検証記録として保管しており、現行教材と混在させないでください。

## 共通教材形式への移行（2026-11-25完了）

- 全18ステージの共通ソースは `demo.html`、`demo.css`、`demo.js`、`demo.details` の4ファイル。教材一覧からブラウザ起動、JSFiddle、ダウンロードを選択できる。
- `verify_handoffs.py` は `demo.html`、`demo.css`、`demo.js` の章間一致を検査する。`tests/verify_shared_materials.py` は4ファイル構成、参照整合性、旧URL互換用HTMLと重複JSの不存在を検査する。移行元との一致は移行コミット `c7f9d0e1597c52d00bb5147c8c6fb5797206493c` のCIで確認済み。
- 旧 `game.js` は全18件削除。旧 `index.html` は同一ディレクトリの `demo.html` へ遷移する互換用HTMLに置換し、ゲーム本体を持たない。配布対象は引き続き4ファイルのみ。過去の作業記録に記載した旧ファイル名は履歴として扱う。
- 作業ブランチからmainへ統合し、VPSへ配備済み。公開用のJSFiddleリンクとGitHubソースリンクは `main` を参照する。公開版コードSHAは `3b56de84c6c806a62b985fec9ec33b8518fd30df`。
- 自動ブラウザ50ケース、既存84アサーション、章間9組、公開99ファイルのバイト一致、公開環境の代表操作3項目が合格。共通教材化は2026-11-25完了。実環境での確認範囲・残る開催準備は [公開・検証記録](docs/shared_materials_release_validation_2026-11-24.md) を参照。
