# dev_history.md - 開発履歴

このファイルはプロジェクトの更新ログです。変更があるたびにここへ追記してください。

---

## v1.0.0 - 2026-02-15 初回リリース

### リポジトリ初期構築

- README.md を作成（プロジェクト概要・インストール手順・使い方・FAQ・技術仕様）
- DeepWiki のサンプル HTML を 3 件追加
  - `Chrome_devTools_elements_1.html` — aurora-labs/pet-care/vetclinic-core
  - `Chrome_devTools_elements_2.html` — aurora-labs/wms-aurora/stock-warehouse-hub
  - `Chrome_devTools_elements_3.html` — aurora-labs/fit-prjs/gymflow-api

### Chrome 拡張機能の実装 (`deepwiki-exporter/`)

- `manifest.json` — Manifest V3 形式。対象ドメイン `app.devin.ai`
- `turndown.js` — HTML→Markdown 変換ライブラリ（Turndown.js v7）を同梱
- `content.js` — メインのコンテンツスクリプト。以下の機能を実装
  - サイドバー自動解析: `a[href^="/wiki/"]` セレクターで全 Wiki ページリンクを検出
  - バックグラウンド一括取得: `fetch()` + Cookie セッションで各ページを順次取得（500ms 間隔）
  - コンテンツ抽出: `.prose-custom` セレクターで本文を取得、不要要素（コピーリンクボタン・ツールチップ・SVG）を除去
  - Markdown 変換: Turndown.js で見出し・リスト・テーブル・コードブロック・details/summary を変換
  - シングルファイル出力: 全ページを `---` 区切りで結合し `.md` としてダウンロード
  - エクスポートボタン UI: 画面右下にピンク色の「🚀 一括エクスポート」ボタンを表示
  - プログレスオーバーレイ: 取得状況をリアルタイムでプログレスバー表示
  - SPA 対応: DOM の遅延ロードを最大 30 秒間ポーリングで待機

### 動作検証

- 3 つのサンプル HTML すべてで正常動作を確認（Node.js + jsdom によるテスト）
  - vetclinic-core: 見出し 16 / 段落 181 / テーブル 4 → Markdown 648 行
  - stock-warehouse-hub: 見出し 21 / 段落 117 / テーブル 4 → Markdown 521 行
  - gymflow-api: 見出し 10 / 段落 195 / テーブル 2 → Markdown 622 行
- 見出し横の「Link copied!」テキスト混入バグを修正済み

### ドキュメント

- `SETUP_GUIDE.md` — 初心者向け導入マニュアルを作成
  - STEP 1〜4 の手順書（フォルダ準備→Chrome 登録→エクスポート実行→NotebookLM アップロード）
  - ASCII 図による画面イメージ付き
  - トラブルシューティング FAQ 7 項目
  - セキュリティ・動作環境の説明

---

<!-- ▼ 今後の更新はここから下に追記してください ▼ -->
