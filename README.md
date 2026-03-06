# 九州大学医学部情報研 - 部活紹介サイト

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://qumiclub.github.io/club-welcome-page/)
[![Editor App](https://img.shields.io/badge/Editor-Vercel-blue)](https://club-welcome-page.vercel.app/)

九州大学医学部情報研の公式ウェブサイトです。Jekyll + GitHub Pages で構築されています。

## 🌐 公開URL

| サービス | URL |
|----------|-----|
| **ウェブサイト** | https://qumiclub.github.io/club-welcome-page/ |
| **記事エディタ** | https://club-welcome-page.vercel.app/ |

---

## 📁 ディレクトリ構成

```
club-welcome-page/
├── _config.yaml          # サイト設定（url, baseurl, repository等）
├── _layouts/             # HTMLレイアウトテンプレート
│   ├── default.html      # 基本レイアウト（共通ヘッダー・フッター）
│   ├── home.html         # トップページ用
│   ├── article.html      # 記事ページ用
│   └── article-list.html # 記事一覧ページ用
├── _pages/               # 各ページ（Markdown）
│   ├── about-us.md       # About Us
│   ├── members.md        # メンバー紹介
│   ├── contact.md        # 連絡先
│   └── article-list.md   # 記事一覧
├── _posts/               # ブログ記事（Markdown）
│   └── YYYY-MM-DD-タイトル.md
├── _includes/            # 共通パーツ（head, header, footer）
├── _sass/                # Sassスタイルシート
├── _data/                # データファイル（news.yml等）
├── assets/
│   ├── css/              # メインCSS
│   ├── images/           # 画像ファイル
│   └── js/               # JavaScript（TOC, タグフィルター等）
├── editor-app/           # 記事エディタ（Next.js）→ 詳細は editor-app/README.md
├── Dockerfile            # Jekyll用Dockerファイル
├── docker-compose.yaml   # Docker Compose設定
└── index.html            # トップページ
```

---

## ✏️ コンテンツの編集方法

### ページの編集
`_pages/` 内のMarkdownファイルを編集します。

### 記事の作成・編集
2つの方法があります：

1. **記事エディタ（推奨）**: https://club-welcome-page.vercel.app/ にアクセスし、Googleアカウントでログインして記事を作成・編集できます。
2. **手動**: `_posts/` に `YYYY-MM-DD-タイトル.md` 形式でファイルを作成します。

### 記事への画像の追加
```markdown
![代替テキスト]({{ site.baseurl }}/assets/images/ファイル名.png)
```
- 記事エディタを使えば、ドラッグ＆ドロップで画像をアップロードできます。

### レイアウト・スタイルの変更
- レイアウト: `_layouts/` 内のHTMLファイル
- スタイル: `assets/css/` 内のCSSファイル

---

## 🐳 ローカル開発環境

### 必要なもの
- Docker / Docker Compose

### Jekyll サイトの起動
```bash
docker compose up
```
http://localhost:4000/club-welcome-page/ でアクセスできます。

ファイル構成を変更した場合は再ビルドしてください：
```bash
docker compose up --build
```

### Editor App の起動
```bash
cd editor-app
npm install
npm run dev
```
http://localhost:3000 でアクセスできます。詳細は [editor-app/README.md](editor-app/README.md) を参照してください。

---

## 🔀 Git ブランチ運用ルール

**`main` ブランチには直接プッシュしません。** 必ずブランチを切ってPull Requestを通してください。

### ブランチ命名規則

| 種類 | 命名 | 例 |
|------|------|----|
| バグ修正 | `fix/内容` | `fix/security-update` |
| 新機能 | `feature/内容` | `feature/dark-mode` |
| コンテンツ更新 | `content/内容` | `content/add-members` |

### コミットメッセージ規則

| プレフィックス | 用途 |
|----------------|------|
| `fix:` | バグ修正 |
| `feat:` | 新機能追加 |
| `docs:` | ドキュメント変更 |
| `style:` | デザイン・見た目の変更 |
| `refactor:` | リファクタリング |

### 開発の流れ
```bash
git checkout main && git pull origin main   # 最新を取得
git checkout -b fix/○○                      # ブランチ作成
# ... 修正 ...
git add . && git commit -m "fix: 修正内容"  # コミット
git push origin fix/○○                      # プッシュ
# GitHub上でPRを作成 → マージ
```

---

## 💡 Tips
- `_pages` はHTMLで書いた方がレイアウトの自由度が高い
- 記事は未来の日付を設定すると予約投稿になる
- `published: false` を frontmatter に設定すると下書き保存になる

---

## 📄 ライセンス
MIT License