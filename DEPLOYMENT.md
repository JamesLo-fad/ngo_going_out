# NGO Going Out - 完整部署指南

## 📋 目录

1. [环境概览](#环境概览)
2. [前置准备](#前置准备)
3. [数据准备](#数据准备)
4. [开发环境部署](#开发环境部署)
5. [生产环境部署](#生产环境部署)
6. [测试验证](#测试验证)
7. [Logo图片处理](#logo图片处理)
8. [故障排查](#故障排查)
9. [日常维护](#日常维护)

---

## 环境概览

### 数据库配置

| 环境 | 数据库名称 | 数据库ID | 用途 |
|------|-----------|---------|------|
| **开发环境** | `ngo_going_out_dev` | `55d3a005-b852-4706-90bf-3fc116393707` | 开发和测试 |
| **生产环境** | `ngo_going_out` | `37d806ec-8aa0-462c-ba35-aa998a1005f6` | 正式运行 |

### Worker配置

| 环境 | Worker名称 | 部署命令 |
|------|-----------|---------|
| **开发环境** | `ngo-api-dev` | `wrangler deploy` |
| **生产环境** | `ngo-api` | `wrangler deploy --env production` |

---

## 前置准备

### 1. 安装必要工具

```bash
# 检查Node.js版本（需要 >= 18）
node --version

# 检查Python版本（需要 >= 3.8）
python3 --version

# 安装wrangler CLI
npm install -g wrangler

# 验证wrangler安装
wrangler --version
```

### 2. 登录Cloudflare

```bash
# 登录Cloudflare账号
wrangler login

# 验证登录状态
wrangler whoami
```

### 3. 安装Python依赖

```bash
# 安装openpyxl（用于读取Excel）
pip3 install openpyxl
```

### 4. 验证数据库存在

```bash
# 列出所有D1数据库
wrangler d1 list

# 应该看到：
# - ngo_going_out_dev (55d3a005-b852-4706-90bf-3fc116393707)
# - ngo_going_out (37d806ec-8aa0-462c-ba35-aa998a1005f6)
```

---

## 数据准备

### 1. 生成清洗后的CSV文件

```bash
cd tools
python3 cleaner.py
```

**预期输出：**
```
处理政策数据...
  完成: 12 条政策记录 -> ../data/policies_clean.csv
处理组织数据...
  完成: 439 条组织记录 -> ../data/orgs_clean.csv

数据清洗完成!
```

### 2. 验证CSV文件

```bash
# 检查文件是否生成
ls -lh ../data/*_clean.csv

# 查看前几行
head -n 3 ../data/orgs_clean.csv
head -n 3 ../data/policies_clean.csv
```

---

## 开发环境部署

### 步骤1：初始化数据库Schema

```bash
# 执行schema到开发数据库
wrangler d1 execute ngo_going_out_dev --file=../d1/schema.sql --remote
```

**预期输出：**
```
🌀 Executing on remote database ngo_going_out_dev (55d3a005-b852-4706-90bf-3fc116393707):
🌀 To execute on your local development database, pass the --local flag to 'wrangler d1 execute'
✅ Executed 15 commands in 0.5s
```

### 步骤2：导入数据（Replace模式）

```bash
# 设置环境变量
export D1_DB_NAME=ngo_going_out_dev

# 导入组织数据
node import_orgs.js ../data/orgs_clean.csv --mode=replace

# 导入政策数据
node import_policies.js ../data/policies_clean.csv --mode=replace
```

**预期输出：**
```
📊 导入组织数据
   数据库: ngo_going_out_dev
   文件: ../data/orgs_clean.csv
   模式: 清空后导入

🗑️  清空现有数据...
   ✓ 已清空 orgs_facets 表
   ✓ 已清空 orgs 表
✅ 现有数据已清空

📥 开始导入数据...
   已导入: 439 条记录...

✅ 导入完成!
   成功: 439 条记录
```

### 步骤3：验证数据导入

```bash
# 检查组织数量
wrangler d1 execute ngo_going_out_dev --command="SELECT COUNT(*) as count FROM orgs;" --remote

# 检查政策数量
wrangler d1 execute ngo_going_out_dev --command="SELECT COUNT(*) as count FROM policies;" --remote

# 查看第一条组织记录
wrangler d1 execute ngo_going_out_dev --command="SELECT id, org_name, founded_date FROM orgs LIMIT 1;" --remote
```

### 步骤4：部署Worker到开发环境

```bash
# 返回项目根目录
cd ..

# 部署到开发环境
wrangler deploy
```

**预期输出：**
```
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded ngo-api-dev (x.xx sec)
Published ngo-api-dev (x.xx sec)
  https://ngo-api-dev.your-subdomain.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 步骤5：测试开发环境

```bash
# 保存Worker URL
DEV_URL="https://ngo-api-dev.your-subdomain.workers.dev"

# 测试健康检查
curl "$DEV_URL/api/health"

# 测试组织列表
curl "$DEV_URL/api/orgs?page=1" | jq '.items[0]'

# 测试组织详情
curl "$DEV_URL/api/orgs/1" | jq '.'

# 测试政策列表
curl "$DEV_URL/api/policies" | jq '.items[0]'
```

---

## 生产环境部署

⚠️ **重要提醒：只有在开发环境完全测试通过后，才进行生产部署！**

### 步骤1：初始化生产数据库Schema

```bash
# 执行schema到生产数据库
wrangler d1 execute ngo_going_out --file=d1/schema.sql --remote --env production
```

### 步骤2：导入数据到生产环境

```bash
cd tools

# 设置生产数据库环境变量
export D1_DB_NAME=ngo_going_out

# 导入组织数据
node import_orgs.js ../data/orgs_clean.csv --mode=replace

# 导入政策数据
node import_policies.js ../data/policies_clean.csv --mode=replace
```

### 步骤3：验证生产数据

```bash
# 检查数据量
wrangler d1 execute ngo_going_out --command="SELECT COUNT(*) as count FROM orgs;" --remote --env production
wrangler d1 execute ngo_going_out --command="SELECT COUNT(*) as count FROM policies;" --remote --env production
```

### 步骤4：部署Worker到生产环境

```bash
cd ..

# 部署到生产环境
wrangler deploy --env production
```

**预期输出：**
```
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded ngo-api (x.xx sec)
Published ngo-api (x.xx sec)
  https://ngo-api.your-subdomain.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 步骤5：测试生产环境

```bash
# 保存生产URL
PROD_URL="https://ngo-api.your-subdomain.workers.dev"

# 完整测试（同开发环境）
curl "$PROD_URL/api/health"
curl "$PROD_URL/api/orgs?page=1"
curl "$PROD_URL/api/orgs/1"
curl "$PROD_URL/api/policies"
```

---

## 测试验证

### 自动化测试脚本

创建 `tools/test-api.sh`:

```bash
#!/bin/bash

# 使用方法: ./test-api.sh <API_URL>
# 例如: ./test-api.sh https://ngo-api-dev.your-subdomain.workers.dev

API_URL=$1

if [ -z "$API_URL" ]; then
  echo "❌ 请提供API URL"
  echo "用法: ./test-api.sh <API_URL>"
  exit 1
fi

echo "🧪 测试API: $API_URL"
echo ""

# 测试1: 健康检查
echo "1️⃣ 测试健康检查..."
curl -s "$API_URL/api/health" | jq '.'
echo ""

# 测试2: 组织列表
echo "2️⃣ 测试组织列表..."
curl -s "$API_URL/api/orgs?page=1&page_size=5" | jq '{total, page, items: .items | length}'
echo ""

# 测试3: 组织详情
echo "3️⃣ 测试组织详情..."
curl -s "$API_URL/api/orgs/1" | jq '{id, org_name, founded_date, donation_post_year}'
echo ""

# 测试4: 搜索功能
echo "4️⃣ 测试搜索功能..."
curl -s "$API_URL/api/orgs?query=爱德" | jq '{total, items: .items | length}'
echo ""

# 测试5: 政策列表
echo "5️⃣ 测试政策列表..."
curl -s "$API_URL/api/policies" | jq '{items: .items | length}'
echo ""

# 测试6: Facets
echo "6️⃣ 测试Facets..."
curl -s "$API_URL/api/orgs/facets" | jq '{countries: .countries | length, sectors: .sectors | length}'
echo ""

echo "✅ 测试完成!"
```

使用测试脚本：

```bash
chmod +x tools/test-api.sh

# 测试开发环境
./tools/test-api.sh https://ngo-api-dev.your-subdomain.workers.dev

# 测试生产环境
./tools/test-api.sh https://ngo-api.your-subdomain.workers.dev
```

### 前端测试

1. **部署前端到Cloudflare Pages**

```bash
# 在项目根目录执行
npx wrangler pages deploy . --project-name=ngo-going-out
```

2. **测试前端功能**
   - 访问首页，查看组织列表
   - 测试搜索功能
   - 点击组织卡片，查看详情页
   - 测试分页功能

---

## Logo图片处理

### Google Drive链接支持

✅ **好消息：代码已经支持Google Drive链接！**

前端代码中的 `driveToDirect()` 函数会自动转换Google Drive链接：

```javascript
// 支持的格式：
// 1. https://drive.google.com/file/d/FILE_ID/view
// 2. https://drive.google.com/open?id=FILE_ID

// 自动转换为：
// https://drive.google.com/uc?export=view&id=FILE_ID
```

### 添加Logo URL的步骤

**方法1：手动编辑CSV（推荐用于少量更新）**

1. 打开 `data/orgs_clean.csv`
2. 在"官网LOGO或图片"列添加Google Drive链接
3. 重新导入数据（使用append模式）：

```bash
export D1_DB_NAME=ngo_going_out_dev
node tools/import_orgs.js ../data/orgs_clean.csv --mode=append
```

**方法2：批量更新（推荐用于大量更新）**

创建 `tools/update_logos.js`:

```javascript
// 批量更新Logo URL
import { d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME;

const logoUpdates = [
  { id: 1, url: 'https://drive.google.com/file/d/xxx/view' },
  { id: 2, url: 'https://drive.google.com/file/d/yyy/view' },
  // ... 更多
];

for (const { id, url } of logoUpdates) {
  await d1Exec(DB_NAME,
    'UPDATE orgs SET logo_url = ? WHERE id = ?',
    [url, id]
  );
}
```

### Google Drive图片权限设置

⚠️ **重要：必须设置为公开访问**

1. 在Google Drive中右键点击图片
2. 选择"共享" → "获取链接"
3. 设置为"任何人都可以查看"
4. 复制链接

### 图片代理（可选）

如果遇到CORS问题，可以启用image-proxy：

1. 部署image-proxy worker：
```bash
cd image-proxy
wrangler deploy
```

2. 更新前端配置：
```javascript
// 在 index.html 和 org.html 中
const IMG_PROXY = "https://ngo-img-proxy.your-subdomain.workers.dev";
```

---

## 故障排查

### 问题1：导入数据失败

**症状：**
```
❌ 导入失败: no such table: orgs
```

**解决方案：**
```bash
# 重新执行schema
wrangler d1 execute <DB_NAME> --file=d1/schema.sql --remote
```

### 问题2：API返回404

**症状：**
```
{"error": "Not found"}
```

**检查步骤：**
1. 确认Worker已部署：`wrangler deployments list`
2. 确认URL正确
3. 检查路由是否正确

### 问题3：数据库连接失败

**症状：**
```
{"error": "Database not initialized"}
```

**解决方案：**
1. 检查wrangler.toml中的database_id是否正确
2. 确认数据库已创建：`wrangler d1 list`
3. 重新执行schema

### 问题4：Logo图片不显示

**可能原因：**
1. Google Drive链接权限未设置为公开
2. 链接格式不正确
3. CORS问题

**解决方案：**
1. 检查Drive文件权限
2. 使用正确的链接格式
3. 启用image-proxy

### 查看实时日志

```bash
# 开发环境
wrangler tail

# 生产环境
wrangler tail --env production
```

---

## 日常维护

### 数据更新流程

**场景1：完全替换数据**

```bash
# 1. 更新Excel文件
# 2. 重新生成CSV
cd tools && python3 cleaner.py

# 3. 导入到开发环境测试
export D1_DB_NAME=ngo_going_out_dev
node import_orgs.js ../data/orgs_clean.csv --mode=replace
node import_policies.js ../data/policies_clean.csv --mode=replace

# 4. 测试通过后，导入到生产环境
export D1_DB_NAME=ngo_going_out
node import_orgs.js ../data/orgs_clean.csv --mode=replace
node import_policies.js ../data/policies_clean.csv --mode=replace
```

**场景2：追加新数据**

```bash
# 使用append模式
export D1_DB_NAME=ngo_going_out_dev
node import_orgs.js ../data/new_orgs.csv --mode=append
```

### 备份数据

```bash
# 导出组织数据
wrangler d1 execute ngo_going_out \
  --command="SELECT * FROM orgs;" \
  --remote --env production \
  > backup_orgs_$(date +%Y%m%d).json

# 导出政策数据
wrangler d1 execute ngo_going_out \
  --command="SELECT * FROM policies;" \
  --remote --env production \
  > backup_policies_$(date +%Y%m%d).json
```

### 监控和分析

1. **访问Cloudflare Dashboard**
   - 查看请求量
   - 查看错误率
   - 查看响应时间

2. **设置告警**
   - 在Dashboard中配置告警规则
   - 错误率超过阈值时发送通知

---

## wrangler.toml 配置详解

### 配置文件说明

`wrangler.toml` 是 Cloudflare Pages 和 Workers 的核心配置文件，位于项目根目录。

**当前配置：**
```toml
# Cloudflare Pages configuration
name = "ngo-going-out"
pages_build_output_dir = "."
compatibility_date = "2024-10-01"

# D1 database binding for Pages Functions
[[d1_databases]]
binding = "database"
database_name = "ngo_going_out"
database_id = "37d806ec-8aa0-462c-ba35-aa998a1005f6"
```

### 配置项详解

#### 1. `name = "ngo-going-out"`
- **作用**：项目名称标识符
- **用途**：在 Cloudflare Dashboard 中显示，用于识别项目
- **注意**：必须与 Cloudflare Pages 项目名称一致

#### 2. `pages_build_output_dir = "."`
- **作用**：指定部署源目录
- **含义**：`"."` 表示当前目录（项目根目录）
- **重要性**：⭐⭐⭐⭐⭐ **最关键的配置**

**为什么这个配置如此重要？**

**项目重构前的问题：**
```
旧结构：
ngo_going_out/
├── wrangler.toml (pages_build_output_dir = "web")
└── web/
    ├── functions/api/
    └── index.html

问题：
- GitHub 自动部署从 web/ 目录读取文件
- 但 GitHub 集成无法正确识别嵌套的 web/functions/ 结构
- 结果：只部署了静态文件，Functions bundle 未上传
- 表现：API 端点返回 HTML 而非 JSON
```

**项目重构后的解决方案：**
```
新结构：
ngo_going_out/
├── wrangler.toml (pages_build_output_dir = ".")
├── functions/api/
└── index.html

优势：
- GitHub 自动部署从根目录读取文件
- 正确识别 functions/ 目录
- 结果：Functions bundle 成功上传 ✅
- 表现：API 端点正常返回 JSON ✅
```

**关键要点：**
- `pages_build_output_dir` 指向的目录必须**直接包含** `functions/` 目录
- 不能有嵌套结构（如 `web/functions/`）
- GitHub 自动部署对嵌套结构的支持有限

#### 3. `compatibility_date = "2024-10-01"`
- **作用**：锁定 Cloudflare Workers 运行时的 API 版本
- **用途**：确保代码行为的一致性和稳定性
- **注意**：
  - 更新此日期可能影响代码行为
  - 更新前需要充分测试
  - 建议定期更新以获得新功能和性能改进

#### 4. D1 数据库绑定

```toml
[[d1_databases]]
binding = "database"
database_name = "ngo_going_out"
database_id = "37d806ec-8aa0-462c-ba35-aa998a1005f6"
```

**`binding = "database"`**
- **作用**：在代码中访问数据库的变量名
- **使用**：`env.database` 在 Functions 代码中
- **重要**：必须与代码中使用的名称完全一致

**代码示例：**
```javascript
// functions/api/test.js
export async function onRequest(context) {
  const { env } = context;

  // 使用 env.database 访问数据库
  // "database" 必须与 wrangler.toml 中的 binding 一致
  const result = await env.database
    .prepare('SELECT * FROM orgs LIMIT 10')
    .all();

  return new Response(JSON.stringify(result.results));
}
```

**`database_name = "ngo_going_out"`**
- **作用**：数据库的人类可读名称
- **用途**：在 Cloudflare Dashboard 中显示

**`database_id = "37d806ec-8aa0-462c-ba35-aa998a1005f6"`**
- **作用**：D1 数据库的唯一标识符
- **获取方式**：`wrangler d1 list`
- **用途**：Cloudflare 用此 ID 定位具体的数据库实例

### 配置注意事项

#### 1. 文件位置要求
- `wrangler.toml` **必须**在项目根目录
- GitHub 自动部署从仓库根目录读取此文件
- 如果放在子目录，部署会失败

#### 2. 数据库绑定的双重配置
**本地开发：**
- 在 `wrangler.toml` 中配置
- 用于 `wrangler pages dev` 命令

**生产环境：**
- 在 Cloudflare Dashboard 中配置
- Pages 项目 → Settings → Functions → D1 database bindings
- 添加绑定：
  - Variable name: `database`（与 wrangler.toml 一致）
  - D1 database: 选择 `ngo_going_out`

**两处都需要配置，且名称必须一致！**

#### 3. 手动部署 vs 自动部署

**手动部署（wrangler pages deploy）：**
```bash
npx wrangler pages deploy . --project-name=ngo-going-out
```
- Wrangler CLI 直接扫描当前目录
- 能够正确处理各种目录结构
- 即使在子目录执行也能成功

**GitHub 自动部署：**
- Cloudflare 服务器端处理
- 严格按照 `pages_build_output_dir` 配置
- 对嵌套结构的处理有限制
- **这就是为什么需要项目重构**

### 验证配置是否正确

#### 1. 检查部署日志

访问 Cloudflare Dashboard → Pages → ngo-going-out → Deployments

**正常日志应包含：**
```
✨ Uploading Functions bundle
✅ Functions uploaded successfully
```

**如果没有这些日志：**
- Functions 未被部署
- 检查 `pages_build_output_dir` 配置
- 检查 `functions/` 目录位置

#### 2. 测试 API 端点

```bash
curl https://ngo-going-out.pages.dev/api/test
```

**期望输出（JSON）：**
```json
{
  "ok": true,
  "message": "Functions are working!",
  "database_test": {
    "success": true,
    "count": 439
  }
}
```

**如果返回 HTML（`<!DOCTYPE html>...`）：**
- Functions 未部署
- 需要检查配置和目录结构

#### 3. 检查浏览器控制台

访问网站，打开开发者工具（F12）：

**正常情况：**
```
Fetching: /api/orgs?page=1&page_size=20
✓ Loaded 20 organizations
```

**异常情况：**
```
Fetching: /api/orgs?page=1&page_size=20
✗ SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### 常见问题

**Q: 修改 wrangler.toml 后需要重新部署吗？**
A: 是的。配置更改不会自动生效，需要：
- Git push 触发自动部署
- 或手动部署：`npx wrangler pages deploy .`

**Q: 为什么手动部署能工作，但 GitHub 自动部署不行？**
A:
- 手动部署：Wrangler CLI 本地扫描，逻辑更智能
- 自动部署：Cloudflare 服务器端处理，严格按配置执行
- 解决方案：确保 `pages_build_output_dir` 正确指向包含 `functions/` 的目录

**Q: 如何切换数据库（开发/生产）？**
A:
- 方法 1：修改 `wrangler.toml` 中的 `database_id`
- 方法 2：在 Cloudflare Dashboard 中更改绑定
- 推荐：使用不同的 Pages 项目（如 ngo-going-out-dev 和 ngo-going-out）

**Q: 数据库绑定名称不匹配会怎样？**
A:
- wrangler.toml: `binding = "DB"`
- 代码: `env.database`
- 结果：`env.database is undefined` 错误
- 解决：确保两处名称完全一致

---

## 快速参考

### 常用命令

```bash
# 数据清洗
cd tools && python3 cleaner.py

# 导入数据（开发）
export D1_DB_NAME=ngo_going_out_dev
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
node tools/import_policies.js data/policies_clean.csv --mode=replace

# 导入数据（生产）
export D1_DB_NAME=ngo_going_out
node tools/import_orgs.js data/orgs_clean.csv --mode=replace
node tools/import_policies.js data/policies_clean.csv --mode=replace

# 部署Worker（开发）
wrangler deploy

# 部署Worker（生产）
wrangler deploy --env production

# 查看日志
wrangler tail
wrangler tail --env production

# 测试API
curl https://ngo-api-dev.your-subdomain.workers.dev/api/health
```

### 环境变量

| 变量名 | 用途 | 示例值 |
|--------|------|--------|
| `D1_DB_NAME` | 指定导入目标数据库 | `ngo_going_out_dev` 或 `ngo_going_out` |

---

## 总结

✅ **部署流程总览：**

1. **准备** → 安装工具、登录Cloudflare
2. **数据** → 运行cleaner.py生成CSV
3. **开发** → 初始化schema → 导入数据 → 部署Worker → 测试
4. **生产** → 初始化schema → 导入数据 → 部署Worker → 测试
5. **发布** → 绑定域名（可选）→ 监控

🎯 **关键要点：**
- 始终先在开发环境测试
- 使用replace模式确保数据一致性
- Google Drive链接已支持，需设置公开权限
- 保持开发和生产环境的代码同步

📞 **需要帮助？**
- 查看实时日志：`wrangler tail`
- 检查部署状态：`wrangler deployments list`
- 查看数据库：`wrangler d1 execute <DB_NAME> --command="SELECT COUNT(*) FROM orgs;"`
