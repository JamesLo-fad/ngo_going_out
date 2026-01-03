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

### 4. 部署Worker

```bash
# 部署到开发环境
wrangler deploy
```

### 5. 测试

```bash
# 获取Worker URL（从上一步的输出中）
# 例如: https://ngo-api-dev.your-subdomain.workers.dev

# 运行测试脚本
./tools/test-api.sh https://ngo-api-dev.your-subdomain.workers.dev
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

```bash
wrangler deploy --env production
```

### 4. 测试生产环境

```bash
./tools/test-api.sh https://ngo-api.your-subdomain.workers.dev
```

---

## 常见问题

### Q: 导入数据时报错 "no such table"
**A:** 需要先执行schema初始化数据库：
```bash
wrangler d1 execute <DB_NAME> --file=d1/schema.sql --remote
```

### Q: 如何查看实时日志？
**A:** 使用wrangler tail命令：
```bash
# 开发环境
wrangler tail

# 生产环境
wrangler tail --env production
```

### Q: 如何更新数据？
**A:** 重新运行cleaner.py和导入脚本：
```bash
cd tools
python3 cleaner.py
export D1_DB_NAME=ngo_going_out_dev
node import_orgs.js ../data/orgs_clean.csv --mode=replace
```

### Q: Logo图片不显示？
**A:** 确保Google Drive链接权限设置为"任何人都可以查看"

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
