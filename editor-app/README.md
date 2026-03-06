# Editor App - 記事エディタ

九州大学医学部情報研のウェブサイト用記事エディタアプリケーションです。  
Next.js + NextAuth + GitHub API で構築されており、ブラウザ上でMarkdown記事を作成・編集・管理できます。

## 🌐 公開URL
https://club-welcome-page.vercel.app/

---

## ✨ 機能

- **記事の作成・編集**: Markdownエディタ + リアルタイムプレビュー
- **画像管理**: ドラッグ＆ドロップ / クリップボード貼り付けでの画像アップロード
- **下書き保存**: `published: false` で下書き状態で保存
- **タグ・著者管理**: 既存のタグ・著者の検索・選択
- **数式対応**: KaTeX による数式レンダリング
- **コードハイライト**: Prism.js によるシンタックスハイライト
- **Google認証**: 許可されたメールアドレスのみアクセス可能

---

## 🛠️ 技術スタック

| 技術 | 用途 |
|------|------|
| [Next.js](https://nextjs.org/) 16 | フレームワーク |
| [NextAuth.js](https://next-auth.js.org/) | Google OAuth 認証 |
| [Octokit](https://github.com/octokit/rest.js) | GitHub API クライアント |
| [React Markdown](https://github.com/remarkjs/react-markdown) | Markdownプレビュー |
| [KaTeX](https://katex.org/) | 数式レンダリング |
| [Tailwind CSS](https://tailwindcss.com/) 4 | スタイリング |
| [Vercel](https://vercel.com/) | ホスティング |

---

## 🚀 セットアップ

### 1. 依存パッケージのインストール
```bash
cd editor-app
npm install
```

### 2. 環境変数の設定
`.env.local` ファイルを作成し、以下の環境変数を設定します。  
`env.example` を参考にしてください。

```bash
cp env.example .env.local
```

| 環境変数 | 説明 |
|----------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `NEXTAUTH_SECRET` | NextAuth用シークレット（32文字以上のランダム文字列） |
| `NEXTAUTH_URL` | アプリのURL（ローカル: `http://localhost:3000`） |
| `ALLOWED_EMAILS` | ログイン許可メールアドレス（カンマ区切り） |
| `GITHUB_TOKEN` | GitHub Personal Access Token（repo権限が必要） |
| `GITHUB_OWNER` | GitHubリポジトリのオーナー |
| `GITHUB_REPO` | GitHubリポジトリ名 |
| `NEXT_PUBLIC_GITHUB_OWNER` | プレビュー用（クライアント側で使用） |
| `NEXT_PUBLIC_GITHUB_REPO` | プレビュー用（クライアント側で使用） |

### 3. 開発サーバーの起動
```bash
npm run dev
```
http://localhost:3000 でアクセスできます。

### 4. ビルド確認
```bash
npm run build
```

---

## 📁 ディレクトリ構成

```
editor-app/
├── app/
│   ├── api/
│   │   ├── articles/         # 記事の取得・削除 API
│   │   │   ├── route.ts      # GET: 記事一覧
│   │   │   └── [filename]/
│   │   │       └── route.ts  # GET: 記事詳細 / DELETE: 記事削除
│   │   ├── auth/             # NextAuth 認証
│   │   ├── commit/           # 記事の作成・更新 API
│   │   │   └── route.ts
│   │   ├── images/           # 画像一覧 API
│   │   │   └── route.ts
│   │   └── upload/           # 画像アップロード API
│   │       └── route.ts
│   ├── auth/error/           # 認証エラーページ
│   ├── dashboard/            # ダッシュボード（記事管理）
│   ├── edit/[filename]/      # 記事編集ページ
│   ├── layout.tsx            # ルートレイアウト
│   ├── page.tsx              # トップページ（新規記事作成）
│   ├── globals.css
│   └── preview.css           # プレビュー用CSS
├── components/
│   ├── Editor.tsx            # メインエディタコンポーネント
│   └── Providers.tsx         # NextAuth SessionProvider
├── lib/
│   └── auth.ts               # NextAuth設定（Google OAuth + メール許可リスト）
├── env.example               # 環境変数テンプレート
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 🔒 セキュリティ

- **認証**: Google OAuth + メールアドレス許可リストによるアクセス制限
- **Path Traversal防止**: APIエンドポイントでファイル名を厳密に検証
- **ファイルアップロード制限**: 画像MIMEタイプのみ許可、最大5MB
- **エラーメッセージ安全化**: 本番環境では内部エラーの詳細を非表示

---

## 📄 ライセンス
MIT License
