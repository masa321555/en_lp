# 合同会社en LP（v1）

## 構成
- `public/index.html` … LP本体
- `css/style.css` … スタイル（トークンは `:root` に集約。HEX直書きなし）
- `js/main.js` … ナビ開閉 / 現在地表示 / セクション出現 / タグライン文節点灯 / フォーム検証（依存ライブラリなし）
- `video/` … ヒーロー動画（hero.webm / hero.mp4、9秒シームレスループ、1920×823、音声なし）。`prefers-reduced-motion` 未設定の環境でJSが読み込んで再生。SPでは4:5に切り出した軽量版（hero_sp.webm / hero_sp.mp4、720×898、0.5〜0.6MB）を使用。減速設定では静止画のまま
- `img/` … ヒーローKV（PC: hero_kv.webp/jpg 2560×1097、SP: hero_kv_sp.webp/jpg 1080×1350）、OGP（ogp.jpg 1200×630）、favicon.svg
- `privacy.html` … プライバシーポリシー（仮文面）
- `404.html` … 404ページ

## デプロイ（Cloudflare Workers + Static Assets）

```
masa321555/en_lp（GitHub）
  ├ public/           … 静的ファイル（index.html / css / js / img / video / privacy.html / 404.html）Static Assetsが配信
  ├ src/index.js      … Worker。/api/contact のみ処理（Turnstile検証 → Resendでメール通知）
  ├ wrangler.jsonc    … 設定（assets.directory = ./public、/api/* はWorker優先）
  └ package.json      … wrangler
```

### 初回セットアップ
1. Cloudflareダッシュボード → Workers & Pages → Create → **Import a repository** → `masa321555/en_lp` を選択
   - Build command: 空欄 ／ Deploy command: `npx wrangler deploy`
   - 以後 `main` への push で自動デプロイ。他ブランチはプレビュー
2. **Secrets**（Worker の Settings → Variables and Secrets）
   - `RESEND_API_KEY` … Resend（https://resend.com）で発行。送信ドメインの SPF/DKIM を Cloudflare DNS に追加して認証
   - `TURNSTILE_SECRET` … Turnstile（ダッシュボード → Turnstile）でウィジェットを作成し、シークレットキーを設定。省略時は検証スキップ
3. **Vars**（同画面、Plaintext）
   - `CONTACT_TO` … 通知先メール（カンマ区切りで複数可）
   - `CONTACT_FROM` … 送信元（例: `合同会社en LP <noreply@your-domain>`、Resendで認証済みドメイン）
4. `index.html` の Turnstile `data-sitekey=""` にサイトキーを入れる
5. **Custom domain** を Worker に割り当て → `index.html` の `https://example.com/`（canonical / og:url / og:image / JSON-LD）を本番URLに置換
6. **Cloudflare Web Analytics**: ダッシュボード → Analytics & Logs → Web Analytics → サイト追加 → 発行された token を `index.html` 末尾のコメントアウトされた beacon スクリプトに入れて有効化（Cookie不使用のため同意バナー不要）

### ローカル確認
```
npm install
cp .dev.vars.example .dev.vars   # 値を入れる
npm run dev                      # http://localhost:8787
```

### 送信テスト
本番URLでフォームを送信し、`CONTACT_TO` にメールが届くことを確認。届かない場合は Worker の Logs（observability 有効）で `error` の種類を確認: `config`=Secrets/Vars未設定、`turnstile`=検証失敗、`send`=Resend側のエラー（ドメイン未認証が多い）

## 公開前に設定するもの
1. **公開URL**: `https://en-ai.co.jp/` に設定済み（canonical / og:url / og:image / JSON-LD）。workers.dev と www からは Worker が 301 で本番へリダイレクト
2. **計測**: まず Cloudflare Web Analytics（上記）。GTM/GA4 を入れる場合は `<!-- GTM: ... -->` の位置に挿入し、Cookie同意の要否を確認
3. **フォーム送信先**: `/api/contact`（同一Worker）に設定済み。上記 Secrets / Vars を設定すれば動作
4. **プライバシーポリシー**: `privacy.html` の【仮】部分を正式文面に差し替え
5. **Webフォント**: IBM Plex Sans JP（Google Fonts）を `<link>` で読込。フォールバックは Hiragino Sans / Meiryo

## 検証
- Playwright（Chromium）375 / 768 / 1280 / 1440px でスクリーンショット確認、機械チェック（alt・参照ファイル・meta・h1・横スクロール）エラー0
- 検証環境ではWebフォントが読めないため、スクリーンショットは代替フォント表示

## 未確定事項
- Before/Afterセクションの所要時間（約3時間→約15分）は想定例。実案件の計測値に差し替える
- 公開URL / GTM ID / フォーム送信先 / プライバシーポリシー正式文面
- ヒーロー静止画（PC/SP/OGP）は動画のループ先頭フレームから生成し、動画と構図を揃えている。差し替える場合は動画と静止画を同時に更新する
