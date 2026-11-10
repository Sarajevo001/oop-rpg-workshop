# VPSデプロイ設定（案・未適用）

共通デプロイ方式の正本は `Sarajevo001/xo-code-busters` の `docs/operation/common-vps-deployment-proposal.md`（現時点ではDraft PR #6）。本書は本プロジェクト固有の設定のみを記録する。

## 既知の設定
| 項目 | 値 | 根拠・状態 |
|---|---|---|
| GitHubリポジトリ | `Sarajevo001/oop-rpg-workshop` | 確認済み |
| 対象ブランチ | `main` | 現在の運用方針 |
| VPS Git作業ディレクトリ | `/var/www/demo/oop-rpg-workshop` | 利用者申告。VPS実機で未照合 |
| 公開URL | `https://demo.sarajevo.jp/oop-rpg-workshop/` | 既存検証記録に記載。最新の公開状態は未確認 |
| 更新方法 | SSH接続後に `git pull --ff-only` | 既存の手動運用 |
| 初回対象 | `presentations/` を含む静的HTML | 初回の検証対象候補 |
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
