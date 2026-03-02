# AI Paradise — デプロイ手順

## 構成

```
ai-paradise/
├── api/
│   └── anthropic.js   ← APIキーを安全に保持するプロキシ（サーバー側）
├── public/
│   └── index.html     ← フロントエンド（/api/anthropic を呼び出す）
├── vercel.json        ← Vercel設定
├── .env.example       ← 環境変数テンプレート
├── .gitignore         ← .envをGitから除外
└── README.md
```

## セキュリティの仕組み

```
ブラウザ                サーバー(Vercel)        Anthropic
   |                        |                      |
   |-- POST /api/anthropic →|                      |
   |   (APIキーなし)         |-- x-api-key: sk-... →|
   |                        |← レスポンス ---------|
   |← レスポンス -----------|
   
APIキーはVercelの環境変数にのみ存在。ブラウザには絶対に届かない。
```

---

## デプロイ手順

### 1. GitHubにリポジトリ作成

```bash
cd ai-paradise
git init
git add .
git commit -m "initial commit"
# GitHubで新規リポジトリ作成後:
git remote add origin https://github.com/あなたのユーザー名/ai-paradise.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. https://vercel.com にアクセス → GitHubでログイン
2. "New Project" → 作ったリポジトリを選択
3. "Environment Variables" に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx...` (Anthropicコンソールから取得) |

4. "Deploy" ボタンを押す → 完了🎉

### 3. Anthropic APIキーの取得

1. https://console.anthropic.com/ にアクセス
2. "API Keys" → "Create Key"
3. キーをコピー → Vercelの環境変数に貼り付け

---

## ALLOWED_ORIGINSの更新

デプロイ後、`api/anthropic.js` の以下を自分のドメインに更新：

```javascript
const ALLOWED_ORIGINS = [
  'https://ai-paradise.vercel.app',  // ← Vercelが発行したURL
  'https://ai-paradise.jp',          // ← 独自ドメインがあれば
];
```

---

## 次のステップ（Supabase連携）

APIキー隠蔽が完了したら、次はデータベース：

1. https://supabase.com でプロジェクト作成
2. 以下のテーブルを作成：
   - `users` — ユーザー認証
   - `products` — 出品物
   - `purchases` — 購入履歴
   - `reviews` — レビュー
3. `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を環境変数に追加

---

## ローカル開発

```bash
npm i -g vercel
vercel dev  # ローカルでサーバーレス関数含めて動作確認
```
