# Personal Professional Website + Knowledge Platform — v1

## Context（背景與目標）

建立一個正式可公開使用、可自行持續管理更新的個人專業知識平台網站（Ze-Xun Lai），
主題為 **Sustainability × Geospatial Intelligence × Biodiversity & Nature × Circular Economy × Carbon Markets & Methodologies**。

不是線上履歷、不是部落格、不是 ESG 行銷頁，而是「顧問／研究者／技術專業人士」的知識平台。
訪客在首頁 10–15 秒內需理解：關注什麼、五大專業領域、跨領域特色、知識文章、研究主題、如何聯絡。

核心需求：
- 完整公開前端（Home / Expertise / Insights / Projects / Research / Methodologies / About / Contact）
- 完整 Admin CMS（`/admin`，需登入、不可被索引），內容管理不需再修改程式碼（**Content ≠ Code**）
- 雙語架構：預設英文，預留繁體中文（台灣用語）；v1 公開內容以英文為主，zh-TW 僅 UI 介面
- 高度可擴充的內容結構（Insights / Methodologies / Projects / Research / References / Media）
- 嚴格保密：**絕不**使用、推測、暗示任何 PwC 或實際客戶的非公開工作內容；Professional experience 第一版刻意保守
- 成熟、編輯感、分析感、極簡的地理空間質感設計；綠色僅為點綴

**已確認決策**：
- Contact 表單訊息僅儲存在 Admin 後台 Inbox（不需外部 Email 服務）
- Admin 登入：首次開啟 `/admin` 時建立第一個管理者帳號（email + 密碼），之後以此登入

---

## 技術架構

### Backend（Enter Cloud）— 必備
本專案目前為 frontend-only，Admin CMS、認證、資料庫、媒體儲存皆需要後端。
實作第一步：呼叫 `supabase_enable` 啟用 Enter Cloud。啟用後會產生 `src/integrations/supabase/client.ts` 與 `types.ts`（框架生成，**不得手動編輯**）。

所有 schema 變更一律經 `supabase_migration` 工具（含 RLS policies），不使用其他路徑。
資料寫入使用 `supabase_insert`（bulk）。

### 資料表（皆啟用 RLS）
| Table | 用途 | 公開讀取規則 |
|---|---|---|
| `admin_users` | 管理者（user_id → auth.users） | 不公開；admin policy |
| `insights` | 文章（完整欄位 + content_md + SEO） | 僅 `status='published'` |
| `methodologies` | 碳方法學庫（完整欄位組） | 僅 published（含 is_sample 標記） |
| `projects` | 獨立／學術／公開知識專案 | 僅 published |
| `research_items` | 研究興趣／目前學習／課程等（item_type） | 僅 published |
| `reference_sources` | Reference 資料庫（title/organisation/author/year/url/source_type） | 全部（引用用） |
| `media_assets` | 媒體庫 metadata | 全部（URL 用） |
| `content_blocks` | 網站可編輯文案（key + value jsonb 多語 {en, zh-TW}） | 全部 |
| `settings` | 網站設定 key/value | 全部 |
| `contact_messages` | 聯絡表單 Inbox | anon 僅可 INSERT；admin 可讀取 |
| `activity_log` | Dashboard「最近活動」 | admin 專用 |

**RLS 模式**（所有表）：
- 內容表：`using (status = 'published')` 給 anon；admin 透過 `auth.uid() in (select user_id from admin_users)` 取得全權限（SELECT/INSERT/UPDATE/DELETE）
- `admin_users` 由 admin policy 保護；第一個管理者由 backend function 建立
- **Draft 對公開前端完全不可見**（查詢 + RLS 雙重保護）
- 建表後用 `supabase_get_table_schema` 驗證 RLS 確實啟用

### 認證（Email/password）
- 首次 `/admin`：若 `admin_users` 為空 → 顯示「建立管理者帳號」表單；`supabase.auth.signUp` 後呼叫 backend function `create_first_admin(user_id)`（內部檢查 admin_users 為空才寫入）
- 之後僅顯示登入表單；session 以 `onAuthStateChange` 為唯一來源，註冊 listener 要先於現有 session 檢查；callback 內呼叫 supabase client 需 `setTimeout(...,0)`
- 用 `supabase_configure_auth` 啟用 email 註冊 + 自動確認（測試不需信件回覆）

### 儲存
- Storage bucket：`media`（public read，admin 寫入），供 Media Library 上傳 JPG/PNG/WebP/SVG

### 依賴新增
- `react-markdown` + `remark-gfm`（文章渲染：表格、清單、引述；Tailwind typography plugin 已在 devDependencies）
- 其餘 UI 全部使用既有 shadcn 元件

---

## 前端公開網站

### 設計系統（index.css + tailwind.config.ts）
- 色票（HSL token）：off-white 暖白背景、charcoal/graphite 墨色文字、deep forest green 主 accent、desaturated blue、earth/sand 輔色。每個 Domain 極細微 secondary accent（GIS teal-blue / Nature forest / Circular earth-amber / Carbon graphite-blue / Climate neutral-blue）
- 字體：`Source Serif 4`（editorial serif，headline/quote）+ `Inter`（sans body），Google Fonts 載入
- 長文閱讀：正文 `max-w-prose`（~65ch），表格可橫向捲動
- 動畫：僅 hover / fade / 極淡 scroll reveal / smooth transition；SVG contour/grid 底紋低調使用；framer-motion 已裝、只做淡入
- Button variants 新增 editorial 風（secondary 語意 token）；禁止 emoji、一律 lucide-react
- 全域可編輯文案一律讀 `content_blocks`，不 hard-code

### 頁面路由（src/router.tsx 擴充）
`/` Home、`/expertise`、`/insights`、`/insights/:slug`、`/methodologies`、`/methodologies/:slug`、`/projects`、`/research`、`/about`、`/contact`、`/admin/*`、`*` 404

### 共用元件
- `src/components/layout/`：SiteLayout（Header nav：Home | Expertise | Insights | Projects | Research | Methodologies | About | Contact + 右側語言切換；Mobile hamburger 用 shadcn Sheet）、Footer（依 §39 規格，Copyright 年份自動）
- `src/components/content/`：SectionHeading、InsightCard、MethodologyCard、ProjectCard、ResearchItem、DomainBadge、Tag、EmptyState、Callout
- `src/lib/`：`content.ts`（查詢 published 資料）、`markdown.tsx`（react-markdown + remark-gfm 自訂元件 map）、`seo.ts`（useSeo hook：title/meta/canonical/OG/JSON-LD）、`types.ts`

### 各頁重點
- **Home**（依 §5–§15 順序）：Hero（主標題+副標題+「Based in Taiwan…」+ CTA + 低調 geospatial SVG 底紋，**不放大型個人照片**）→ 五個 Domain → **Where the Fields Connect**（SVG network/matrix 靜態圖，六組交集）→ Featured Insights → Methodology Library 預覽 → Currently Exploring → Selected Projects/Research 預覽 → About 預覽 → Contact CTA → Footer
- **Expertise**：五 Domain 各含 What I Work On / Frameworks & Methodologies / Analytical Approaches / Tools / Business Applications / Related Insights & Research；內容來自 `content_blocks`（含 §34 提供之五大領域公開知識摘要）。框架名稱僅列公開名稱，不暗示執行過客戶案
- **Insights**：列表 + category/tag 篩選 + 關鍵字搜尋（client-side）+ 文章詳情（markdown 渲染、References & Further Reading 自動組、Related Expertise / Related Insights、SEO + Article schema）
- **Methodologies**：Library 列表，依 registry 分組（Verra/VCS、Gold Standard、Article 6.4、Other）＋ 篩選；詳情頁渲染完整欄位組；**不捏造任何 methodology 的版本／要求**，僅 seed 1 筆標示 `Sample structure – replace with verified methodology information.` 的 draft
- **Projects**：只允許 Independent / Academic / Public Knowledge / Personal Research 類；不建立虛構 client case study；v1 以乾淨空狀態 + 編輯性說明呈現，由使用者自行新增
- **Research**：Research Interests（§38 清單，使用者已提供的公開內容）+ Current Learning + 其他 item_type；不做到證照牆
- **About**：Profile（§十三 提供文字）＋ How I Think ＋ Education（B.Sc. in Geography, NTU）＋ geography background；**不補充任何未提供的經歷**
- **Contact**：「Let’s Connect」+ LinkedIn/Email/Location（Taipei, Taiwan）+ 表單（Name/Email/Organisation/Topic dropdown/Message）+ honeypot spam protection；成功後寫入 `contact_messages`

### SEO
- `useSeo` 每頁設定 SEO Title / Meta Description / Canonical / OG / JSON-LD（Person、Article、Breadcrumb）
- `public/robots.txt`（Disallow `/admin`）、`public/sitemap.xml`（主要頁面；slug 動態內容 sitemap 列為後續擴充）
- `index.html` 更新 title/meta/OG + 字體

---

## Admin CMS（/admin）

所有路由由 `ProtectedRoute` 保護（檢查 session + admin 身分），`/admin/*` 不出現在 public nav、robots 封鎖。

- **Layout**：側邊欄（Dashboard、Insights、Methodologies、Projects、Research、Media、References、Website Content、Messages、Settings、Sign out）
- **Dashboard**：Content Overview（各類 published/draft 計數）、最近活動（activity_log）、Quick Actions（+ New Insight / + New Methodology / + New Project / + New Research Item）
- **Insights Editor**：全部欄位 + Markdown 編輯器（textarea + 即時 Preview 切換，可直接貼上 Markdown）＋ Save Draft / Preview / Publish / Update / Unpublish / Archive / Delete；**slug 只在建立時自動產生，之後修改 title 不自動改 slug**
- **Methodologies / Projects / Research**：各自 CRUD 表單（對應完整欄位）
- **Media Library**：上傳到 `media` bucket、縮圖瀏覽、編輯 alt/caption/description、Copy URL、刪除
- **References**：CRUD（title/organisation/author/year/url/source_type）；Insight 可多選並調整順序，詳情頁自動輸出「References & Further Reading」
- **Website Content**：編輯 `content_blocks`（Hero、CTA、About、Expertise、Footer、Tagline 等，支援多語 value）
- **Settings**：Website Name、Tagline、Profile Image、Email、LinkedIn、Location、預設 SEO、Footer Text、Default Author、Contact Topics（Copyright 自動）
- **Messages**：聯絡 Inbox（new/read/archived 狀態）

### Content ≠ Code
新增文章／方法學／研究／專案／引用／證照不需改任何前端程式。

---

## Seed Content（首版不能是空殼；全部為公開知識）

- **10 篇 Published Insights**（§35 提供完整 title/summary/content）：GIS×2、Biodiversity×2、Circular×2、Carbon Methodology×3、Carbon Markets×1 — 以 bulk `supabase_insert` 寫入
- **10 篇 Draft placeholders**（§36）：僅 title/category/slug/status=draft（Article 6.2/6.4、Baselines、Leakage、Permanence、Remote Sensing for Carbon MRV、GIS Nature-risk、TNFD LEAP、ISO 59020、Nature Markets）
- **Methodology Library**：只 seed 1 筆明確標示 sample 的 draft methodology；4 個 registry 分類以 filter 呈現
- **Content blocks**：Hero、§34 五大領域摘要、About Profile、Research Interests、Footer、CTA 等
- **Research items**：§38 Currently Exploring 清單（使用者提供的公開 research interests）
- **Projects**：不 seed 捏造內容，乾淨空狀態
- **Settings**：Ze-Xun Lai / Taipei, Taiwan / email / LinkedIn placeholder（留空由使用者填）

---

## 關鍵檔案

**修改**：`i18n.config.json`（zh-CN→zh-TW）、`public/locales/en.json`、`src/index.css`、`tailwind.config.ts`、`index.html`、`src/router.tsx`、`src/pages/Index.tsx`（改寫 Home）、`public/robots.txt`
**刪除**：`public/locales/zh-CN.json`
**新增**：`public/locales/zh-TW.json`、`src/lib/{types,content,markdown,seo}.ts`、`src/components/layout/*`、`src/components/content/*`、`src/components/home/*`、`src/pages/{Expertise,Insights,InsightDetail,Methodologies,MethodologyDetail,Projects,Research,About,Contact}.tsx`、`src/admin/*`（AdminLayout、ProtectedRoute、Login、Setup、Dashboard、Insights/InsightEditor、Methodologies/MethodologyEditor、Projects、Research、Media、References、Content、Settings、Messages）

**沿用既有**：`@/components/ui/*`（shadcn）、`@/lib/utils`（cn）、`@/i18n/config` 與 `language-switcher.tsx`、`LanguageSwitcher` 直接重用；`src/integrations/supabase/client.ts`（啟用後生成）

---

## 實作順序

1. 啟用 Enter Cloud → 建立 tables/migrations + RLS + storage bucket + 認證設定
2. 設計系統（index.css / tailwind.config.ts / fonts）
3. i18n：zh-TW 切換 + UI 翻譯 + 語言切換器
4. 公開前端全部頁面（含 Home 各區塊、markdown 渲染、SEO hook）
5. Admin：認證 + 佈局 + Dashboard + 各管理模組
6. Seed content（10 文章 + placeholders + content blocks + research + settings）
7. 驗證（lint / tsc / build / i18n check / 截圖）

---

## Implementation checklist

- [ ] 啟用 Enter Cloud（`supabase_enable`），確認生成 `src/integrations/supabase/client.ts`
- [ ] `supabase_migration` 建立全部資料表（insights/methodologies/projects/research_items/reference_sources/media_assets/content_blocks/settings/contact_messages/activity_log/admin_users），**每表同 migration 內 enable RLS**
- [ ] RLS policies：內容表 anon 僅讀 published；admin（`admin_users` 身分）全權限；`contact_messages` anon 僅 INSERT
- [ ] 用 `supabase_get_table_schema` 逐表確認 RLS 已啟用且 policies 存在
- [ ] 建立 `media` storage bucket（public read / admin write）
- [ ] `supabase_configure_auth` 啟用 email signup + 自動確認；`create_first_admin` backend function 建立
- [ ] `add_dependency`：`react-markdown`、`remark-gfm`
- [ ] index.css + tailwind.config.ts：暖白/墨色/forest green/blue/sand token、serif+sans font、fade/scroll-reveal 動畫、editorial button variants
- [ ] index.html：title/meta/OG/Google Fonts
- [ ] i18n.config.json：zh-CN → zh-TW（label 繁體中文、detect zh-TW/zh-Hant/zh）；新增 `public/locales/zh-TW.json`、刪除 zh-CN.json
- [ ] 公開前端：SiteLayout（Header nav + hamburger Sheet + LanguageSwitcher + Footer 依 §39）
- [ ] Home 完整 10 區塊（Hero 無大頭照、五 Domain、Where the Fields Connect、Featured Insights、Methodology 預覽、Currently Exploring、Projects/Research 預覽、About 預覽、Contact CTA、Footer）
- [ ] Expertise 頁：五 Domain 完整內容，來自 content_blocks
- [ ] Insights 列表（category/tag 篩選 + 關鍵字）+ 詳情頁（markdown 渲染、References 自動輸出、Related、SEO + Article JSON-LD）
- [ ] Methodologies 列表（registry 分組 + 篩選）+ 詳情頁（完整欄位組）
- [ ] Projects / Research / About / Contact 頁（Contact 表單 honeypot + 寫入 DB）
- [ ] `useSeo` hook + robots.txt（Disallow /admin）+ sitemap.xml
- [ ] Admin：Setup 首建帳號 → Login → ProtectedRoute + AdminLayout 側邊欄
- [ ] Admin Dashboard（計數 + 最近活動 + Quick Actions）
- [ ] Insights 管理列表 + Editor（Markdown textarea + Preview、Save Draft/Publish/Update/Unpublish/Archive/Delete、slug 只在建立時產生）
- [ ] Methodologies / Projects / Research CRUD
- [ ] Media Library（上傳/瀏覽/編輯/Copy URL/刪除）
- [ ] References CRUD + Insight 引用排序
- [ ] Website Content 編輯器（content_blocks 多語）+ Settings 表單 + Messages Inbox
- [ ] Seed：10 篇 Published Insights（§35 全文）+ 10 篇 Draft placeholders + 1 筆 sample draft methodology + content_blocks（§34、Hero、About、Footer）+ research items（§38）+ settings
- [ ] 確認公開前端任何地方**不出現** draft 內容、/admin 不可被 anon 存取
- [ ] 全站無 PwC / 客戶 / 未授權工作內容（grep 檢查關鍵字：PwC、client、advis）

---

## Verification checklist

- [ ] `pnpm lint` 通過；`pnpm exec tsc --noEmit` 通過；`pnpm run build` 成功
- [ ] `node /workspace/.agents/skills/enter_i18n/assets/scripts/check-i18n.mjs` 輸出 passed（fallback en 為結構基準、en 與 zh-TW key 集合一致）
- [ ] `node /workspace/.agents/skills/enter_i18n/assets/scripts/scan-i18n.mjs` 成功產出報告
- [ ] Home 頁截圖（desktop_1280 + mobile_390）：Hero 無大頭照、五 Domain、Connect 圖、內容正確、無排版破壞
- [ ] Insights / Expertise / Methodologies / About / Contact 各至少一張 desktop 截圖確認版型
- [ ] 正面：已 publish 文章在 Insights 列表與詳情頁可見；featured 文章出現在首頁
- [ ] 負面：draft/archived 文章在公開前端任何 URL 直接存取（如 `/insights/:slug`）均不可見
- [ ] 負面：未登入存取 `/admin/*` 被導向登入；一般訪客無法讀取 draft
- [ ] 邊界：長文 markdown（含表格、引述、清單）渲染正常且正文寬度受 `max-w-prose` 限制；mobile 下表格可橫向捲動
- [ ] 功能：Contact 表單提交後訊息出現在 Admin Messages Inbox；honeypot 觸發時不寫入
- [ ] 功能：建立文章 → Save Draft → Preview → Publish 流程；修改 title 後 slug 不變
- [ ] 功能：Media 上傳後 URL 可用於文章 hero image
- [ ] 功能：SEO title/meta/JSON-LD 在文章與各頁正確輸出
- [ ] 內容安全：grep `PwC|pwc|client|advised|delivered` 於 `src/` 與 seed 內容無不當出現（不含框架公開名稱上下文）
