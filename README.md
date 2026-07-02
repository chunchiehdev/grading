# Gradsystem (反思回饋系統)

一套以大型語言模型為核心的「反思回饋系統」,提供 AI 評分、分項回饋、多輪挑戰式對話與教師端可見性。

- **正式環境網域**:`agenticgrader.com`
- **開發環境網域**:`dev.agenticgrader.com`
- **網域與 DNS**:由 Cloudflare 管理(含 Cloudflare Tunnel 連通本地 vLLM)
- **部署平台**:Kubernetes (Kustomize) + Docker Compose(備援/單機)

---

## 1. 這個系統是什麼

| 角色 | 在系統裡做什麼 |
|---|---|
| 學生 | 上傳反思作業 → 收 AI 評分與回饋 → 跟 AI 多輪對話 → 選擇採納或保留並寫理由 → 最終提交 |
| 教師 | 建立課程、班級、作業、評分規準 → 看 AI 評分依據 → 人工批註與發布成績 |
| 管理員 | 控管使用者權限、看 AI 模型使用率、看系統背景工作狀態 |

---

## 2. 使用的技術

| 類別 | 用什麼 |
|---|---|
| 前端 | React 19 + React Router v7 + TypeScript + Tailwind + Radix UI |
| 後端 | React Router v7 loaders/actions(同一份 codebase)+ Express middleware |
| 資料庫 | PostgreSQL 16(透過 Prisma 6 操作) |
| 快取 / 工作佇列 | Redis 7.4 + BullMQ |
| 檔案儲存 | MinIO (S3 相容) |
| 即時通訊 | Socket.io + Redis adapter |
| AI(雲端) | Gemini 2.5 Flash / 3.1 Flash Lite(主力,支援 3 把 key 輪轉) |
| AI(備援) | OpenAI |
| AI(地端) | vLLM 跑 `openai/gpt-oss-20b`,透過 Cloudflare Tunnel 對外 |
| 認證 | Google OAuth 2.0 |
| 容器/部署 | Docker → Docker Hub → Kubernetes 1.34(用 Kustomize 管理) |
| 反向代理 | Traefik |
| CI/CD | GitHub Actions |

---

## 3. 第一次本機跑起來

### 3.1 先裝這些東西
- Node.js 22
- Docker + Docker Compose
- Git

### 3.2 步驟

```bash
# 1. clone 專案
git clone <repo-url>
cd grading

# 2. 複製環境變數樣板,然後填值(下一節說明要填什麼)
cp .env.example .env

# 3. 啟動所有相依服務(Postgres / Redis / MinIO / App)
docker-compose -f docker-compose.dev.yaml up -d

# 4. 套用資料庫 schema
npm run migrate:dev

# 5. 建立第一個 admin 帳號(用你的 Google 帳號登入後再執行)
npm run seed:admin

# 6. 開始開發
npm run dev
```

開好之後本機進 `http://localhost:3000`。

---

## 4. 環境變數要準備什麼

`.env.example` 已經列出完整清單,以下是**必須要有**的部分:

### 4.1 必填(沒有就跑不起來)

| 變數 | 怎麼取得 |
|---|---|
| `DATABASE_URL` | 本機開發直接用 `postgresql://postgres:postgres@db:5432/grading`,正式環境另填 |
| `REDIS_HOST` / `REDIS_PASSWORD` | 本機開發 host 填 `redis`,密碼自訂 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | 自訂,跟 `DATABASE_URL` 對齊 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) 申請 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 開 OAuth 2.0 Client,redirect URI 填 `https://你的網域/auth/google/callback` |
| `AUTH_SECRET` / `THEME_SECRET` | 自己生隨機字串(`openssl rand -hex 32`) |
| `MINIO_ENDPOINT` / `MINIO_PORT` | 本機開發 host 填 `minio`,port 填 `9000` |

### 4.2 選填(沒有也能跑,但功能會降級)

| 變數 | 拿來幹嘛 | 不填會怎樣 |
|---|---|---|
| `GEMINI_API_KEY2` / `GEMINI_API_KEY3` | 第 2、3 把 key,做輪轉提升吞吐量 | 只用單 key,8 RPM 上限 |
| `OPENAI_API_KEY` | Gemini 失敗時的備援 | Gemini 掛掉就沒備援 |
| `OLLAMA_API_URL` / `OLLAMA_API_KEY` / `OLLAMA_MODEL` | 地端 vLLM 用 | 走純雲端 |
| `GOOGLE_SEARCH_API_KEY` / `GOOGLE_SEARCH_ENGINE_ID` | AI 學習助手的網頁搜尋 | 用模擬搜尋結果 |
| `PDF_PARSER_API_URL` | 接 PDF 解析微服務 | 不能解 PDF |

### 4.3 功能開關(直接抄預設值就好)

| 變數 | 預設 | 說明 |
|---|---|---|
| `USE_AI_SDK_GRADING` | `false` | 是否用新的 AI SDK 評分架構 |
| `USE_AGENT_GRADING` | `false` | 是否用 Agent-based 多步驟評分 |
| `USE_MCP` | `true` | 是否啟用 MCP |
| `LOG_LEVEL` | `info` | log 等級 |

---

## 5. 網域與 Cloudflare

| 環境 | 網域 | 用途 |
|---|---|---|
| Production | `agenticgrader.com` | 正式環境 |
| Development | `dev.agenticgrader.com` | 開發環境 |
| Local vLLM | 透過 Cloudflare Tunnel 公開 | 把本機的 vLLM 暴露給雲端 k8s 用 |

Cloudflare 主要做三件事:
1. **DNS 解析** — A / CNAME 記錄指到 k8s ingress
2. **HTTPS / TLS** — 自動發憑證,流量加密
3. **Cloudflare Tunnel** — 從本地 vLLM 開一條反向通道到雲端,不用對外開 port

> 接手時要確認:Cloudflare 帳號的 DNS 紀錄、Tunnel 是否還是活著的狀態。

---

## 6. 部署(Kubernetes 為主)

### 6.1 部署環境一覽

| Overlay | 路徑 | 用途 |
|---|---|---|
| `dev-k3s` | `k8s/main-service/overlays/dev-k3s` | k3s 開發環境 |
| `prod-k3s` | `k8s/main-service/overlays/prod-k3s` | k3s 正式環境 |
| `dev-k8s` | `k8s/main-service/overlays/dev-k8s` | Mars k8s 開發 |
| `prod-k8s` | `k8s/main-service/overlays/prod-k8s` | Mars k8s 正式 |
| `monitor-k3s` | `k8s/main-service/overlays/monitor-k3s` | 監控用 |

### 6.2 部署流程(由 GitHub Actions 自動跑)

```
推 code 到對應分支
  → GitHub Actions 觸發
  → 從 GitHub Secrets 拉 .secrets.env 內容
  → kustomize 自動生成 Secret(帶 hash)
  → kubectl apply -k <overlay 路徑>
  → Pod 自動 rollout
```

### 6.3 GitHub Secrets 對照

| Secret 名稱 | 對應的 overlay |
|---|---|
| `DEV_K3S_ENV_FILE` | `dev-k3s` |
| `PROD_K3S_ENV_FILE` | `prod-k3s` |
| `DEV_K8S_ENV_FILE` | `dev-k8s` |
| `PROD_K8S_ENV_FILE` | `prod-k8s` |

> 注意:Secret 的內容是**整個 .env 檔**。新增變數時要把舊的整段貼回去再加,不然會覆蓋掉。

### 6.4 手動部署(緊急用)

```bash
# 進到 overlay 目錄
cd k8s/main-service/overlays/prod-k3s

# 把環境變數寫成 .secrets.env(不要進 git)
vim .secrets.env

# apply
kubectl apply -k .

# 用完刪掉
rm .secrets.env
```

---

## 7. 維運常用指令

### 7.1 資料庫
```bash
# 套用最新 migration(會自動 generate Prisma client)
npm run migrate:dev      # 開發環境
npm run migrate:prod     # 正式環境

# 在 k8s 上跑 migration
kubectl exec -it deployment/gradsystem-dev -n gradsystem-dev -- npx prisma migrate deploy

# 砍掉重建(只能在 dev)
npm run reset
```

### 7.2 建第一個 admin
```bash
# 本機
npm run seed:admin

# k8s
kubectl exec -it deployment/gradsystem-dev -n gradsystem-dev -- npm run seed:admin
```

### 7.3 重啟服務
```bash
# Docker Compose
docker-compose -f docker-compose.dev.yaml restart app

# k8s
kubectl rollout restart deployment gradsystem-dev -n gradsystem-dev
```

### 7.4 清掉 BullMQ 卡住的 job
```bash
npm run cleanup:jobs
```

### 7.5 看 log
```bash
# Docker Compose
docker-compose -f docker-compose.dev.yaml logs -f app

# k8s
kubectl logs -f deployment/gradsystem-dev -n gradsystem-dev
```

### 7.6 開發環境清空 Vite cache(熱重載出怪事時)
```bash
npm run dev:clean
```

---

## 8. 程式碼怎麼看

| 想了解什麼 | 看哪裡 |
|---|---|
| 路由怎麼接 | `app/routes.ts` + `app/routes/` |
| 業務邏輯 / DB 操作 | `app/services/*.server.ts` |
| API endpoints | `app/api/` |
| Prisma 資料模型 | `prisma/schema.prisma` |
| AI 評分核心 | `app/services/ai-grader.server.ts` + `app/services/gemini-prompts.server.ts` |
| 挑戰式對話 prompt | `app/services/dialectical-feedback.server.ts` |
| BullMQ worker | `app/workers/grading.server.ts` |
| Socket.io | `app/lib/websocket/` |
| 認證中介層 | `app/middleware/auth.server.ts` |
| 共用型別 | `app/types/` |
| Zod 驗證 schema | `app/schemas/` |

---

## 9. 常見開發指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 啟動開發 server |
| `npm run typecheck` | TypeScript 檢查(**不要用 `npx tsc` 或 `npm run build`**) |
| `npm run lint:fix` | ESLint 自動修 |
| `npm run format` | Prettier 排版 |
| `npm run test` | 跑所有測試一次 |
| `npm run test:watch` | watch 模式 |
| `npm run test:coverage` | 帶覆蓋率 |
| `npm run test -- <檔案>` | 只跑單一測試檔 |
| `npx prisma generate` | 重新生 Prisma client |

---

## 10. 注意事項與雷區

- **`.server.ts` 後綴**很重要,沒有它的話 server 端程式碼會被打進 client bundle。
- **永遠用 `react-router` 不要用 `@remix-run/*`**(這是 React Router v7,不是 Remix)。
- **不要 commit `.env`、`.secrets.env`**,只進 GitHub Secrets。
- **`npm run build` 不能拿來做型別檢查**,要用 `npm run typecheck`。
- **跑測試前先把 Docker 啟動**,測試會直接打開發資料庫。
- **k8s 部署後**要記得跑 migration,新欄位才會生效。
- **Gemini 三把 key 要從不同的 Google 帳號**申請,不然 rate limit 會共享。

---

## 11. 出問題先看哪裡

| 症狀 | 看哪 |
|---|---|
| Pod 起不來 | `kubectl describe pod` + `kubectl logs` |
| 評分卡住 / job 不動 | BullMQ 儀表板(管理員端) + `npm run cleanup:jobs` |
| 學生看不到 AI 回饋 | Socket.io 連線狀態 + Redis pub/sub |
| Google 登入失敗 | `GOOGLE_REDIRECT_URI` 跟 Cloud Console 對不對得起來 |
| Gemini 一直 429 | 三把 key 至少有一把要還沒 cooldown,看 admin 端的 AI 使用率頁面 |
| MinIO 檔案讀不到 | bucket 有沒有建、權限有沒有對 |

---

## 12. 重要外部資源

| 資源 | 連結 |
|---|---|
| Gemini API Key 申請 | https://aistudio.google.com/app/apikey |
| Google OAuth 設定 | https://console.cloud.google.com/apis/credentials |
| Cloudflare 控制台 | https://dash.cloudflare.com |
| DeepWiki(本專案 AI 文件) | https://deepwiki.com/chunchiehdev/grading |

---
