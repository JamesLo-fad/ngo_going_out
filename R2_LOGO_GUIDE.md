# R2 Logo 上传和管理指南

## 概述

组织的 logo 现在存储在 Cloudflare R2 bucket 中，通过 CDN Worker 提供公开访问。

**R2 Bucket**: `ngo-org-logo`
**CDN URL**: `https://ngo-logo-cdn.ngo-going-out.workers.dev`

## 上传 Logo 到 R2

### 方法 1：使用 Wrangler CLI（推荐）

```bash
# 上传单个文件
npx wrangler r2 object put ngo-org-logo/<filename> --file=<local-path> --remote

# 示例：上传爱德基金会的 logo
npx wrangler r2 object put ngo-org-logo/org_1.png --file=./logos/aidejiijinhui.png --remote
```

### 方法 2：使用 Cloudflare Dashboard

1. 登录 Cloudflare Dashboard
2. 进入 R2 → ngo-org-logo
3. 点击 "Upload" 按钮
4. 选择文件上传

### 方法 3：批量上传脚本

创建 `tools/upload_logos.sh`:

```bash
#!/bin/bash

# 批量上传 logos 目录下的所有图片
for file in logos/*.png; do
  filename=$(basename "$file")
  echo "Uploading $filename..."
  npx wrangler r2 object put ngo-org-logo/"$filename" --file="$file" --remote
done

echo "✓ All logos uploaded"
```

使用方法：
```bash
chmod +x tools/upload_logos.sh
./tools/upload_logos.sh
```

## 文件命名规范

**推荐格式**: `org_<id>.png`

示例：
- `org_1.png` - 爱德基金会（id=1）
- `org_2.png` - 招商局慈善基金会（id=2）
- `org_3.png` - 中国扶贫基金会（id=3）

**为什么使用这个格式？**
- 简单明了
- 与数据库 ID 对应
- 容易自动化处理

## 更新数据库中的 Logo URL

### 单个组织

```bash
# 更新爱德基金会的 logo URL
npx wrangler d1 execute ngo_going_out --remote --command="
UPDATE orgs
SET logo_url = 'https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.png'
WHERE id = 1;
"
```

### 批量更新

创建 `tools/update_logo_urls.js`:

```javascript
import { execSync } from 'child_process';

const DB_NAME = process.env.D1_DB_NAME || 'ngo_going_out';
const CDN_URL = 'https://ngo-logo-cdn.ngo-going-out.workers.dev';

// 需要更新的组织 ID 列表
const orgIds = [1, 2, 3, 4, 5]; // 添加更多 ID

console.log(`Updating logo URLs in database: ${DB_NAME}\n`);

for (const id of orgIds) {
  const logoUrl = `${CDN_URL}/org_${id}.png`;
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

console.log('\n✓ Batch update complete');
```

使用方法：
```bash
export D1_DB_NAME=ngo_going_out_dev  # 或 ngo_going_out（生产环境）
node tools/update_logo_urls.js
```

## 验证 Logo 显示

### 1. 测试 CDN 访问

```bash
# 测试文件是否可以通过 CDN 访问
curl -I https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.png
```

应该返回 `200 OK` 和图片的 Content-Type。

### 2. 测试 API 返回

```bash
# 检查 API 是否返回正确的 logo_url
curl https://ngo-going-out.pages.dev/api/orgs/1 | jq '.logo_url'
```

应该返回 R2 CDN 的 URL。

### 3. 测试前端显示

1. 访问：`https://ngo-going-out.pages.dev/org.html?id=1`
2. 检查是否显示 logo
3. 打开浏览器控制台，应该看到：`[logo loaded] https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.png`

## 图片规格建议

| 用途 | 推荐尺寸 | 格式 | 大小 |
|------|---------|------|------|
| 列表页缩略图 | 240x160 | PNG | < 50KB |
| 详情页 Logo | 128x128 | PNG | < 100KB |

**建议**：
- 使用 PNG 格式（支持透明背景）
- 保持合理的文件大小（< 100KB）
- 使用正方形或 3:2 比例

## 管理 R2 Bucket

### 列出所有文件

```bash
npx wrangler r2 object list ngo-org-logo --remote
```

### 删除文件

```bash
npx wrangler r2 object delete ngo-org-logo/<filename> --remote
```

### 下载文件

```bash
npx wrangler r2 object get ngo-org-logo/<filename> --remote --file=<local-path>
```

## 常见问题

### Q: Logo 不显示，显示 "No Logo"

**可能原因**：
1. 文件没有上传到 R2
2. 文件名不匹配
3. 数据库中的 logo_url 不正确
4. CDN Worker 还在部署中（等待几分钟）

**解决方案**：
```bash
# 1. 检查文件是否存在
npx wrangler r2 object list ngo-org-logo --remote | grep org_1.png

# 2. 检查数据库中的 URL
npx wrangler d1 execute ngo_going_out --remote --command="SELECT id, org_name, logo_url FROM orgs WHERE id = 1;"

# 3. 测试 CDN 访问
curl -I https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.png
```

### Q: 如何批量迁移现有的 Google Drive logo？

**步骤**：
1. 从 Google Drive 下载所有 logo 图片
2. 重命名为 `org_<id>.png` 格式
3. 使用批量上传脚本上传到 R2
4. 使用批量更新脚本更新数据库

### Q: 可以使用其他图片格式吗（JPG, SVG）？

**可以**，但需要：
1. 上传时使用正确的文件扩展名
2. 更新数据库中的 logo_url 包含正确的扩展名
3. 确保浏览器支持该格式

**推荐**：统一使用 PNG 格式，简化管理。

### Q: 如何优化图片大小？

**工具推荐**：
- **ImageOptim** (Mac)
- **TinyPNG** (在线)
- **ImageMagick** (命令行)

**示例**（使用 ImageMagick）：
```bash
# 批量优化 logos 目录下的所有 PNG
for file in logos/*.png; do
  convert "$file" -resize 240x160 -quality 85 "$file"
done
```

## 成本估算

**Cloudflare R2 免费额度**：
- 存储：10 GB
- Class A 操作（写入）：100 万次/月
- Class B 操作（读取）：1000 万次/月

**估算**（假设 500 个组织，每个 logo 50KB）：
- 存储：500 × 50KB = 25MB（远低于 10GB 限制）
- 读取：假设每天 1000 次访问 = 30 万次/月（远低于 1000 万次限制）

**结论**：完全在免费额度内，无需付费。

## 下一步

1. **准备 logo 图片**：收集所有组织的 logo
2. **批量上传**：使用上传脚本上传到 R2
3. **更新数据库**：批量更新 logo_url
4. **验证显示**：检查前端是否正常显示

## 相关文档

- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [项目部署文档](./DEPLOYMENT.md)
