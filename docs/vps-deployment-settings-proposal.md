# VPSデプロイ設定（案・未適用）

共通デプロイ方式の正本は `Sarajevo001/xo-code-busters` の `docs/operation/common-vps-deployment-proposal.md`（現時点ではDraft PR #6）。本書は本プロジェクト固有の設定のみを記録する。

## 既知の設定
| 項目 | 値 | 根拠・状態 |
|---|---|---|
| GitHubリポジトリ | `Sarajevo001/oop-rpg-workshop` | 確認済み |
| 対象ブランチ | `main` | 現在の運用方針 |
| 現行VPS Git作業ディレクトリ | `/home/debian/oop-rpg-workshop` | 既存記録による。VPS実機で未照合 |
| 現行の静的公開用コピー | `/var/www/demo/oop-rpg-workshop` | Git作業ツリーとは別。実機で未照合 |
| 移行後のGit作業ディレクトリ | `/srv/GitHub/Sarajevo001/oop-rpg-workshop` | 共通標準v1.4.0の配置案。未適用 |
| 移行後の静的公開ルート | `src/public/` | リポジトリ内の公開対象。VPSのCaddy設定は未変更 |
| 公開URL | `https://demo.sarajevo.jp/oop-rpg-workshop/` | 既存検証記録に記載。最新の公開状態は未確認 |
| 更新方法 | SSH接続後に `git pull --ff-only` | 既存の手動運用 |
| 初回対象 | `index.html`、`examples/`、`presentations/` を含む静的HTML | 現行公開実態の確認後に検証 |
| 起動方法 | GitHub Actionsの `workflow_dispatch` | 未実装 |

## 実装前に確定する事項
- VPS上の `pwd`、`git remote -v`、`git branch --show-current`、`git status --short` による実環境照合。
- GitHub Actions専用のSSH認証方式、SSHユーザー、秘密情報の登録先、ホスト鍵の照合方法。
- 対象コミットSHAと既存CI成功の対応、公開HTMLの確認対象。
- 静的HTML以外の変更が含まれる場合の停止条件。

## 安全条件
- 本書は設定案であり、GitHub Actionsのデプロイ処理・VPS設定は未作成。
- 接続先・作業ディレクトリを任意入力で指定できるようにしない。
- VPSで未コミット変更や想定外のリモートが見つかったら停止する。強制reset・mergeを行わない。
- CI証跡が対象SHAと一致しない場合は停止する。
- 実際のデプロイは、接続・状態確認と安全条件が満たされた後に実施する。

## 共通標準v1.4.0への移行に伴う確認
- `index.html` と、そこから参照される `presentations/`（chapter0〜4、summary）、`examples/` を公開対象として `src/public/` へ移動する。現行VPSで実際に配信されている範囲とリンク切れの有無を先に測定する。
- `archive/`、`docs/`、`ci/`、`tests/`、`.github/`、Git管理情報を直接公開しない。公開コピーにしかないファイルは事前に差分・保全を確認する。
- `https://demo.sarajevo.jp/oop-rpg-workshop/` を維持する。Caddyの実設定・シンボリックリンク・権限を読み取り専用で確認し、旧公開コピーは切替検証完了まで保持する。
- `standards-reference.json` の共通標準v1.4.0への更新は**別途適用承認が必要**。管理元での正式改訂だけで採用版を変更しない。
- 本書はGitHub Actions導入とVPS切替を実施する指示ではない。実機未確認の間は変更を停止する。
