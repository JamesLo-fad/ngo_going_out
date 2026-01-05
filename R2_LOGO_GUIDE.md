# R2 图片存储系统指南

## 概述

本项目使用 **Cloudflare R2** 存储和提供所有图片资源（组织 logo、项目图片等）。通过 **Pages Functions** 提供公开访问，无需单独的 Worker。

**核心组件**：
- **R2 Bucket**: `ngo-org-logo` - 存储所有图片文件
- **Pages Function**: `functions/cdn/[[path]].js` - 提供公开访问
- **CDN URL**: `https://ngo-going-out.pages.dev/cdn/{filename}`
- **路由配置**: `_routes.json` - **必须包含 `/cdn/*`**（关键！）

## 快速开始

### 上传第一个 Logo

```bash
# 1. 上传图片到 R2
npx wrangler r2 object put ngo-org-logo/org_1.png --file=./my-logo.png --remote

# 2. 更新数据库
npx wrangler d1 execute ngo_going_out --remote --command="
UPDATE orgs
SET logo_url = 'https://ngo-going-out.pages.dev/cdn/org_1.png'
WHERE id = 1;
"

# 3. 验证
curl -I https://ngo-going-out.pages.dev/cdn/org_1.png
# 应该返回: Content-Type: image/png
```

### 测试系统

```bash
# 运行完整测试
bash tools/test-logo-system.sh
```

## 系统架构

### 工作原理

```
用户浏览器
    ↓
https://ngo-going-out.pages.dev/cdn/org_1.png
    ↓
_routes.json 路由规则 (/cdn/* → Pages Function)
    ↓
functions/cdn/[[path]].js
    ↓
env.LOGO_BUCKET (R2 绑定)
    ↓
R2 Bucket: ngo-org-logo
    ↓
返回图片 (带缓存 headers)
```

### 关键配置文件

#### 1. `_routes.json` ⭐ **最关键**

```json
{
  "version": 1,
  "include": ["/api/*", "/cdn/*"],
  "exclude": []
}
```

**为什么重要**：
- 没有这个配置，`/cdn/*` 请求不会路由到 Pages Function
- 会回退到静态文件服务，返回 HTML 而不是图片
- **这是之前 logo 无法显示的根本原因**

#### 2. `wrangler.toml`

```toml
[[r2_buckets]]
binding = "LOGO_BUCKET"
bucket_name = "ngo-org-logo"
```

#### 3. Cloudflare Dashboard 绑定

**必须手动配置**（GitHub 自动部署需要）：
1. Pages → ngo-going-out → Settings → Functions
2. R2 bucket bindings → Add binding
3. Variable name: `LOGO_BUCKET`
4. R2 bucket: `ngo-org-logo`
5. Save

## 文件组织规范

### 当前结构（单一目录）

```
R2 Bucket: ngo-org-logo/
├── org_1.png
├── org_2.jpg
├── org_3.webp
└── ...
```

### 推荐结构（未来扩展）

```
R2 Bucket: ngo-org-logo/
├── orgs/                    # 组织 logo
│   ├── org_1.png
│   ├── org_2.jpg
│   └── ...
├── projects/                # 项目图片
│   ├── project_1.jpg
│   ├── project_2.png
│   └── ...
├── events/                  # 活动照片
│   └── ...
├── documents/               # 文档封面
│   └── ...
└── thumbnails/              # 缩略图（自动生成）
    └── ...
```

### 命名规范

**组织 Logo**：
- 格式：`org_{id}.{ext}` 或 `orgs/org_{id}.{ext}`
- 示例：`org_1.png`, `orgs/org_1.jpg`

**项目图片**：
- 格式：`projects/project_{id}.{ext}`
- 示例：`projects/project_123.jpg`

**支持的格式**：
- PNG（推荐，支持透明）
- JPG/JPEG（照片）
- WebP（现代格式，更小）
- SVG（矢量图）

## 上传图片

### 方法 1：Wrangler CLI（推荐）

```bash
# 单个文件
npx wrangler r2 object put ngo-org-logo/org_1.png --file=./logo.png --remote

# 指定 Content-Type
npx wrangler r2 object put ngo-org-logo/org_1.svg \
  --file=./logo.svg \
  --content-type="image/svg+xml" \
  --remote
```

### 方法 2：批量上传脚本

创建 `tools/upload-logos.sh`：

```bash
#!/bin/bash

BUCKET="ngo-org-logo"
SOURCE_DIR="./logos"

echo "Uploading logos from $SOURCE_DIR to R2..."

for file in "$SOURCE_DIR"/*; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading: $filename"
    npx wrangler r2 object put "$BUCKET/$filename" --file="$file" --remote
  fi
done

echo "✓ Upload complete"
```

使用：
```bash
chmod +x tools/upload-logos.sh
./tools/upload-logos.sh
```

### 方法 3：Cloudflare Dashboard

1. 登录 Cloudflare Dashboard
2. R2 → ngo-org-logo
3. Upload → 选择文件
4. 上传

## 更新数据库

### 单个组织

```bash
npx wrangler d1 execute ngo_going_out --remote --command="
UPDATE orgs
SET logo_url = 'https://ngo-going-out.pages.dev/cdn/org_1.png'
WHERE id = 1;
"
```

### 批量更新

创建 `tools/update-logo-urls.js`：

```javascript
import { execSync } from 'child_process';

const DB_NAME = 'ngo_going_out';
const CDN_URL = 'https://ngo-going-out.pages.dev/cdn';

// 组织 ID 和文件名映射
const updates = [
  { id: 1, filename: 'org_1.png' },
  { id: 2, filename: 'org_2.jpg' },
  { id: 3, filename: 'org_3.webp' },
  // 添加更多...
];

console.log(`Updating ${updates.length} logo URLs...\\n`);

for (const { id, filename } of updates) {
  const logoUrl = `${CDN_URL}/${filename}`;
  const sql = `UPDATE orgs SET logo_url = '${logoUrl}' WHERE id = ${id};`;

  try {
    execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="${sql}"`, {
      stdio: 'inherit'
    });
    console.log(`✓ Updated org ${id}`);
  } catch (error) {
    console.error(`✗ Failed to update org ${id}`);
  }
}

console.log('\\n✓ Batch update complete');
```

使用：
```bash
node tools/update-logo-urls.js
```

## 管理 R2 Bucket

### 列出文件

```bash
# 列出所有文件
npx wrangler r2 bucket list ngo-org-logo --remote

# 注意：wrangler 不支持 `r2 object list`，使用 Dashboard 或 API
```

### 下载文件

```bash
npx wrangler r2 object get ngo-org-logo/org_1.png --remote --file=./downloaded.png
```

### 删除文件

```bash
npx wrangler r2 object delete ngo-org-logo/org_1.png --remote
```

## 图片规格建议

| 用途 | 推荐尺寸 | 格式 | 大小 |
|------|---------|------|------|
| 组织 Logo（列表） | 240x160 | PNG/WebP | < 50KB |
| 组织 Logo（详情） | 128x128 | PNG/WebP | < 100KB |
| 项目图片 | 800x600 | JPG/WebP | < 200KB |
| 活动照片 | 1200x800 | JPG/WebP | < 300KB |

**优化建议**：
- 使用 WebP 格式（更小，质量更好）
- 压缩图片（TinyPNG, ImageOptim）
- 使用合适的尺寸（不要上传过大的原图）

## 验证和测试

### 1. 测试 CDN 访问

```bash
# 检查 HTTP 状态和 Content-Type
curl -I https://ngo-going-out.pages.dev/cdn/org_1.png

# 期望输出：
# HTTP/2 200
# content-type: image/png
# cache-control: public, max-age=31536000
# access-control-allow-origin: *
```

### 2. 测试 API 返回

```bash
# 检查 API 是否返回正确的 logo_url
curl -s https://ngo-going-out.pages.dev/api/orgs/1 | grep logo_url

# 期望输出：
# "logo_url": "https://ngo-going-out.pages.dev/cdn/org_1.png"
```

### 3. 测试前端显示

1. 访问：`https://ngo-going-out.pages.dev/org.html?id=1`
2. 检查 logo 是否显示
3. 打开浏览器控制台（F12）
4. 应该看到：`[logo loaded] https://ngo-going-out.pages.dev/cdn/org_1.png`

### 4. 运行完整测试

```bash
bash tools/test-logo-system.sh
```

## 故障排查

### Logo 不显示，显示 "No Logo"

#### 检查 1：CDN 端点是否返回图片

```bash
curl -I https://ngo-going-out.pages.dev/cdn/org_1.png
```

**如果返回 HTML（`content-type: text/html`）**：
- 问题：`_routes.json` 未包含 `/cdn/*`
- 解决：检查 `_routes.json` 文件，确保包含 `/cdn/*`
- 重新部署

**如果返回 500 错误**：
- 问题：R2 绑定未配置
- 解决：在 Dashboard 中添加 R2 绑定（见上文）

**如果返回 404 错误**：
- 问题：R2 中没有该文件
- 解决：检查文件是否上传，文件名是否正确

#### 检查 2：R2 中是否有文件

```bash
npx wrangler r2 object get ngo-org-logo/org_1.png --remote --file=/tmp/test.png
```

如果失败，说明文件不存在，需要上传。

#### 检查 3：数据库中的 URL 是否正确

```bash
npx wrangler d1 execute ngo_going_out --remote --command="
SELECT id, org_name, logo_url FROM orgs WHERE id = 1;
"
```

确保 `logo_url` 是 `https://ngo-going-out.pages.dev/cdn/org_1.png`

#### 检查 4：浏览器 Network 标签

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 刷新页面
4. 找到 `org_1.png` 请求
5. 查看状态码和响应内容

### CDN 返回 HTML 而不是图片

**原因**：`_routes.json` 未包含 `/cdn/*`，请求被路由到静态文件服务

**解决方案**：

1. 检查 `_routes.json`：
```json
{
  "version": 1,
  "include": ["/api/*", "/cdn/*"],
  "exclude": []
}
```

2. 如果缺少 `/cdn/*`，添加并提交：
```bash
git add _routes.json
git commit -m "Add /cdn/* to routes"
git push
```

3. 等待部署完成（约 30-60 秒）

4. 清除浏览器缓存并测试

### R2 绑定未生效

**症状**：CDN 返回 "R2 bucket not configured"

**解决方案**：

1. 检查 `wrangler.toml`：
```toml
[[r2_buckets]]
binding = "LOGO_BUCKET"
bucket_name = "ngo-org-logo"
```

2. 在 Cloudflare Dashboard 中添加绑定：
   - Pages → ngo-going-out → Settings → Functions
   - R2 bucket bindings → Add binding
   - Variable name: `LOGO_BUCKET`
   - R2 bucket: `ngo-org-logo`
   - Save

3. 触发重新部署：
```bash
git commit --allow-empty -m "Trigger redeployment"
git push
```

## 未来扩展

### 支持更多图片类型

当前系统已经支持任意文件路径，可以轻松扩展：

**项目图片**：
```javascript
// 数据库添加字段
ALTER TABLE projects ADD COLUMN image_url TEXT;

// 上传图片
npx wrangler r2 object put ngo-org-logo/projects/project_1.jpg --file=./image.jpg --remote

// 更新数据库
UPDATE projects SET image_url = 'https://ngo-going-out.pages.dev/cdn/projects/project_1.jpg' WHERE id = 1;
```

**活动照片**：
```javascript
// 创建新表
CREATE TABLE event_photos (
  id INTEGER PRIMARY KEY,
  event_id INTEGER,
  photo_url TEXT,
  caption TEXT
);

// 上传多张照片
npx wrangler r2 object put ngo-org-logo/events/event_1_photo_1.jpg --file=./photo1.jpg --remote
npx wrangler r2 object put ngo-org-logo/events/event_1_photo_2.jpg --file=./photo2.jpg --remote
```

### 图片处理和优化

**未来可以添加**：
- 自动生成缩略图
- 图片格式转换（自动转 WebP）
- 图片压缩
- 响应式图片（不同尺寸）

**实现方式**：
- Cloudflare Images（付费服务）
- 或自定义 Worker 处理

### 批量导入工具

创建 `tools/import-logos-from-csv.js`：

```javascript
// 从 CSV 读取组织 ID 和 logo 文件路径
// 批量上传到 R2
// 批量更新数据库
```

## 成本估算

**Cloudflare R2 免费额度**：
- 存储：10 GB
- Class A 操作（写入）：100 万次/月
- Class B 操作（读取）：1000 万次/月

**估算**（500 个组织，每个 logo 50KB）：
- 存储：500 × 50KB = 25MB（远低于 10GB）
- 读取：假设每天 10,000 次访问 = 300 万次/月（远低于 1000 万次）

**结论**：完全在免费额度内，无需付费。

## 相关文档

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Pages Functions 文档](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [项目部署文档](./DEPLOYMENT.md)

---

**最后更新**：2026-01-06
**系统状态**：✅ 完全正常运行
**测试脚本**：`tools/test-logo-system.sh`
