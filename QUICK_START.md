# 快速开始指南

## 🚀 5分钟快速部署

### 前提条件
- ✅ 已安装 Node.js (>= 18)
- ✅ 已安装 Python 3
- ✅ 已安装 wrangler CLI
- ✅ 已登录 Cloudflare (`wrangler login`)

---

## 开发环境部署（推荐先部署这个）

### 1. 准备数据

```bash
# 安装Python依赖
pip3 install openpyxl

# 生成清洗后的CSV
cd tools
python3 cleaner.py
cd ..
```

### 2. 初始化数据库

```bash
# 执行schema
wrangler d1 execute ngo_going_out_dev --file=d1/schema.sql --remote
```

### 3. 导入数据

```bash
cd tools

# 设置数据库名称
export D1_DB_NAME=ngo_going_out_dev

# 导入组织数据（439条）
node import_orgs.js ../data/orgs_clean.csv --mode=replace

# 导入政策数据（12条）
node import_policies.js ../data/policies_clean.csv --mode=append

cd ..
```

### 4. 部署到 Cloudflare Pages

**推荐方式：GitHub 自动部署**

```bash
# 提交代码到 GitHub
git add .
git commit -m "Initial deployment"
git push origin main

# Cloudflare 会自动检测并部署
# 访问 Cloudflare Dashboard 查看部署状态
```

**或手动部署：**

```bash
# 在项目根目录执行
npx wrangler pages deploy . --project-name=ngo-going-out
```

### 5. 配置 D1 数据库绑定

在 Cloudflare Dashboard 中：
1. Pages → ngo-going-out → Settings → Functions
2. D1 database bindings → Add binding
3. Variable name: `database`
4. D1 database: 选择 `ngo_going_out_dev`
5. Save

### 6. 测试

```bash
# 测试 Pages 部署的 API
# 例如: https://ngo-going-out.pages.dev

# 运行测试脚本
./tools/test-api.sh https://ngo-going-out.pages.dev
```

---

## 生产环境部署（开发环境测试通过后）

### 1. 初始化生产数据库

```bash
wrangler d1 execute ngo_going_out --file=d1/schema.sql --remote --env production
```

### 2. 导入数据到生产

```bash
cd tools

# 设置生产数据库
export D1_DB_NAME=ngo_going_out

# 导入数据
node import_orgs.js ../data/orgs_clean.csv --mode=replace
node import_policies.js ../data/policies_clean.csv --mode=replace

cd ..
```

### 3. 部署到生产

**推荐方式：GitHub 自动部署**

```bash
# 确保代码已推送到 main 分支
git push origin main

# Cloudflare 自动部署到生产环境
```

**或手动部署：**

```bash
npx wrangler pages deploy . --project-name=ngo-going-out --branch=production
```

### 4. 配置生产环境 D1 绑定

在 Cloudflare Dashboard 中：
1. Pages → ngo-going-out → Settings → Functions
2. D1 database bindings → 确认绑定到 `ngo_going_out`（生产数据库）

### 5. 测试生产环境

```bash
./tools/test-api.sh https://ngo-going-out.pages.dev
```

---

## 常见问题

### Q: 导入数据时报错 "no such table"
**A:** 需要先执行schema初始化数据库：
```bash
wrangler d1 execute <DB_NAME> --file=d1/schema.sql --remote
```

### Q: 如何查看实时日志？
**A:** 使用 Cloudflare Dashboard 或 wrangler tail 命令：
```bash
# 查看 Pages 部署日志
# Cloudflare Dashboard → Pages → ngo-going-out → Deployments

# 或使用 wrangler（如果配置了 Worker）
wrangler tail
```

### Q: 如何更新数据？
**A:** 重新运行cleaner.py和导入脚本：
```bash
cd tools
python3 cleaner.py
export D1_DB_NAME=ngo_going_out_dev
node import_orgs.js ../data/orgs_clean.csv --mode=replace
```

### Q: Logo图片如何管理？
**A:** 使用 Cloudflare R2 存储图片：
```bash
# 上传 logo 到 R2
npx wrangler r2 object put ngo-org-logo/org_1.png --file=./logo.png --remote

# 更新数据库
npx wrangler d1 execute ngo_going_out --remote --command="
UPDATE orgs SET logo_url = 'https://ngo-going-out.pages.dev/cdn/org_1.png' WHERE id = 1;
"

# 测试
bash tools/test-logo-system.sh
```

详细文档：[R2_LOGO_GUIDE.md](./R2_LOGO_GUIDE.md)

---

## 两种导入模式

### Replace模式（清空后导入）- 推荐
```bash
node import_orgs.js ../data/orgs_clean.csv --mode=replace
```
- 先清空现有数据
- 再导入新数据
- 适用于：完全替换数据、数据结构变更

### Append模式（追加/更新）
```bash
node import_orgs.js ../data/orgs_clean.csv --mode=append
```
- 保留现有数据
- 如果ID冲突则更新
- 适用于：追加新记录、更新部分数据

---

## 环境对照表

| 项目 | 开发环境 | 生产环境 |
|------|---------|---------|
| **数据库名** | `ngo_going_out_dev` | `ngo_going_out` |
| **Worker名** | `ngo-api-dev` | `ngo-api` |
| **部署命令** | `wrangler deploy` | `wrangler deploy --env production` |
| **环境变量** | `export D1_DB_NAME=ngo_going_out_dev` | `export D1_DB_NAME=ngo_going_out` |

---

## 下一步

1. ✅ 部署完成后，访问Worker URL测试API
2. ✅ 部署前端到Cloudflare Pages
3. ✅ （可选）绑定自定义域名
4. ✅ （可选）添加Logo URL

详细文档请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)
