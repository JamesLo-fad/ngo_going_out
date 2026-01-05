# Google Drive Logo 使用指南

## ✅ 好消息：代码已支持Google Drive链接！

您的前端代码已经内置了Google Drive链接的自动转换功能，无需修改代码即可使用。

---

## 工作原理

### 自动转换函数

前端代码（`index.html` 和 `org.html`）中的 `driveToDirect()` 函数会自动处理：

```javascript
function driveToDirect(url) {
  if (!url) return null;
  // 识别 /d/FILE_ID 格式
  const m = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  // 转换为直接访问格式
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}
```

### 支持的链接格式

| 输入格式 | 自动转换为 |
|---------|-----------|
| `https://drive.google.com/file/d/FILE_ID/view` | `https://drive.google.com/uc?export=view&id=FILE_ID` |
| `https://drive.google.com/open?id=FILE_ID` | `https://drive.google.com/uc?export=view&id=FILE_ID` |
| `https://drive.google.com/uc?export=view&id=FILE_ID` | 保持不变 |

---

## 如何添加Logo

### 步骤1：准备Google Drive图片

1. **上传图片到Google Drive**
   - 推荐尺寸：400x400 或 800x800 像素
   - 格式：PNG（透明背景）或 JPG

2. **设置公开权限**（⚠️ 重要！）
   - 右键点击图片 → "共享"
   - 点击"更改为任何人都可以查看"
   - 复制链接

3. **获取链接**
   - 链接格式：`https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing`
   - 或简化格式：`https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view`

### 步骤2：添加到数据库

**方法A：编辑CSV后重新导入（推荐用于批量更新）**

1. 打开 `data/orgs_clean.csv`
2. 在"官网LOGO或图片"列添加Google Drive链接
3. 保存文件
4. 重新导入：

```bash
export D1_DB_NAME=ngo_going_out_dev
node tools/import_orgs.js ../data/orgs_clean.csv --mode=replace
```

**方法B：使用SQL直接更新（推荐用于少量更新）**

```bash
# 更新单个组织的Logo
wrangler d1 execute ngo_going_out_dev \
  --command="UPDATE orgs SET logo_url = 'https://drive.google.com/file/d/YOUR_FILE_ID/view' WHERE id = 1;" \
  --remote

# 批量更新多个组织
wrangler d1 execute ngo_going_out_dev \
  --command="
    UPDATE orgs SET logo_url = 'https://drive.google.com/file/d/FILE_ID_1/view' WHERE id = 1;
    UPDATE orgs SET logo_url = 'https://drive.google.com/file/d/FILE_ID_2/view' WHERE id = 2;
    UPDATE orgs SET logo_url = 'https://drive.google.com/file/d/FILE_ID_3/view' WHERE id = 3;
  " \
  --remote
```

**方法C：创建批量更新脚本**

创建 `tools/update_logos.js`:

```javascript
import { d1Exec } from './helpers.js';

const DB_NAME = process.env.D1_DB_NAME || 'ngo_going_out_dev';

// Logo URL映射表
const logoUpdates = [
  { id: 1, url: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view' },
  { id: 2, url: 'https://drive.google.com/file/d/2B3C4D5E6F7G8H9I0J1K/view' },
  { id: 3, url: 'https://drive.google.com/file/d/3C4D5E6F7G8H9I0J1K2L/view' },
  // ... 添加更多
];

async function updateLogos() {
  console.log(`📸 更新Logo URL到数据库: ${DB_NAME}\n`);

  let success = 0, failed = 0;

  for (const { id, url } of logoUpdates) {
    try {
      await d1Exec(DB_NAME, 'UPDATE orgs SET logo_url = ? WHERE id = ?', [url, id]);
      console.log(`✓ 已更新组织 ${id}`);
      success++;
    } catch (e) {
      console.error(`✗ 更新组织 ${id} 失败:`, e.message);
      failed++;
    }
  }

  console.log(`\n✅ 完成: ${success} 成功, ${failed} 失败`);
}

updateLogos().catch(e => {
  console.error('❌ 更新失败:', e);
  process.exit(1);
});
```

使用方法：

```bash
export D1_DB_NAME=ngo_going_out_dev
node tools/update_logos.js
```

---

## 验证Logo显示

### 1. 检查数据库

```bash
# 查看某个组织的Logo URL
wrangler d1 execute ngo_going_out_dev \
  --command="SELECT id, org_name, logo_url FROM orgs WHERE id = 1;" \
  --remote
```

### 2. 测试API返回

```bash
# 获取组织详情，检查logo_url字段
curl https://ngo-api-dev.your-subdomain.workers.dev/api/orgs/1 | jq '.logo_url'
```

### 3. 前端测试

1. 访问组织列表页
2. 检查组织卡片是否显示Logo
3. 点击进入详情页，检查大Logo是否显示

---

## 故障排查

### 问题1：Logo不显示，显示"No Logo"占位图

**可能原因：**
- Logo URL为空
- Google Drive权限未设置为公开
- 链接格式不正确

**解决方案：**

1. 检查数据库中的logo_url：
```bash
wrangler d1 execute ngo_going_out_dev \
  --command="SELECT id, org_name, logo_url FROM orgs WHERE logo_url IS NOT NULL LIMIT 5;" \
  --remote
```

2. 检查Google Drive权限：
   - 访问Drive链接，确认可以直接查看
   - 如果提示"需要权限"，说明未设置公开

3. 测试链接转换：
   - 在浏览器中访问：`https://drive.google.com/uc?export=view&id=YOUR_FILE_ID`
   - 应该直接显示图片

### 问题2：Logo加载很慢

**原因：** Google Drive服务器响应较慢

**解决方案：**

**选项A：启用图片代理（推荐）**

1. 部署image-proxy worker：
```bash
cd image-proxy
wrangler deploy
# 记录Worker URL，例如: https://ngo-img-proxy.your-subdomain.workers.dev
```

2. 更新前端配置：

编辑 `index.html` 和 `org.html`：

```javascript
// 找到这一行
const IMG_PROXY = "";

// 改为
const IMG_PROXY = "https://ngo-img-proxy.your-subdomain.workers.dev";
```

3. 重新部署前端

**选项B：迁移到Cloudflare R2**

1. 创建R2 bucket
2. 上传图片到R2
3. 使用R2的公开URL

### 问题3：CORS错误

**症状：** 浏览器控制台显示CORS错误

**解决方案：** 启用图片代理（见上方选项A）

---

## 最佳实践

### 1. 图片规格建议

| 用途 | 推荐尺寸 | 格式 | 大小 |
|------|---------|------|------|
| 列表页缩略图 | 400x400 | PNG/JPG | < 100KB |
| 详情页大图 | 800x800 | PNG/JPG | < 200KB |

### 2. 命名规范

在Google Drive中使用清晰的命名：
```
org_001_爱德基金会_logo.png
org_002_招商局慈善基金会_logo.png
```

### 3. 文件夹组织

在Google Drive中创建专门的文件夹：
```
NGO Logos/
  ├── 001_爱德基金会.png
  ├── 002_招商局慈善基金会.png
  └── ...
```

### 4. 批量处理流程

1. 收集所有Logo图片
2. 统一上传到Google Drive
3. 批量设置公开权限
4. 导出链接列表到CSV
5. 使用批量更新脚本导入

---

## 示例：完整的Logo更新流程

### 场景：为前10个组织添加Logo

**步骤1：准备图片和链接**

创建 `logo_mapping.csv`:
```csv
id,logo_url
1,https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view
2,https://drive.google.com/file/d/2B3C4D5E6F7G8H9I0J1K/view
3,https://drive.google.com/file/d/3C4D5E6F7G8H9I0J1K2L/view
...
```

**步骤2：更新到开发数据库**

```bash
# 方法1：使用SQL
wrangler d1 execute ngo_going_out_dev \
  --command="$(cat logo_mapping.csv | tail -n +2 | awk -F',' '{print \"UPDATE orgs SET logo_url = \\047\" $2 \"\\047 WHERE id = \" $1 \";\"}')" \
  --remote

# 方法2：使用脚本（推荐）
node tools/update_logos.js
```

**步骤3：验证**

```bash
# 检查更新结果
wrangler d1 execute ngo_going_out_dev \
  --command="SELECT id, org_name, SUBSTR(logo_url, 1, 50) as logo FROM orgs WHERE logo_url IS NOT NULL;" \
  --remote
```

**步骤4：测试前端显示**

访问前端页面，确认Logo正常显示

**步骤5：同步到生产环境**

```bash
# 重复步骤2，但使用生产数据库
export D1_DB_NAME=ngo_going_out
node tools/update_logos.js
```

---

## 总结

✅ **已支持的功能：**
- Google Drive链接自动转换
- 多种链接格式识别
- 前端自动处理

⚠️ **需要注意：**
- 必须设置Google Drive文件为公开
- 推荐使用图片代理提升加载速度
- 建议统一图片规格和命名

📝 **推荐工作流：**
1. 收集并上传图片到Google Drive
2. 设置公开权限
3. 使用批量更新脚本导入
4. 在开发环境测试
5. 同步到生产环境

🎯 **下一步：**
- 开始收集组织Logo
- 按照本指南添加到数据库
- 验证前端显示效果
