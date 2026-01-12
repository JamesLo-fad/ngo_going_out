# 数据库维护指南

## 概述

本文档记录了数据库维护操作的标准流程和最佳实践，包括数据清理、格式统一、批量更新等操作。

## 日期格式统一化

### 背景

数据库中的日期字段（`founded_date` 成立时间、`go_global_date` 出海时间）存在多种不同格式，需要统一为标准格式以保持数据一致性和可读性。

### 标准格式规范

所有日期字段应遵循以下格式规范：

1. **纯年份**：`YYYY 年`
   - 示例：`2016 年`
   - 注意：年份和"年"之间有一个空格

2. **完整日期**：`YYYY 年 MM 月 DD 日`
   - 示例：`2016 年 6 月 22 日`
   - 注意：年、月、日之间都有空格
   - 月份和日期不需要前导零（如 `6 月` 而不是 `06 月`）

3. **特殊说明**：保留括号内的说明文字
   - 示例：`2014年（前身 1993年注册为北京市志愿者协会）`
   - 示例：`1973年（中国图书馆代表团访美）`
   - 示例：`2008年（接受资金援助）`

4. **占位符**：保持原样
   - 示例：`-`、`null`

### 格式转换规则

以下是自动化脚本执行的转换规则：

| 原格式 | 转换后格式 | 示例 |
|--------|-----------|------|
| `YYYY.0` | `YYYY 年` | `2016.0` → `2016 年` |
| `YYYY` | `YYYY 年` | `2016` → `2016 年` |
| `YYYY-MM-DD` | `YYYY 年 MM 月 DD 日` | `2016-06-22` → `2016 年 6 月 22 日` |
| `YYYY/MM/DD` | `YYYY 年 MM 月 DD 日` | `2016/06/22` → `2016 年 6 月 22 日` |
| `YYYY年MM月DD日` | `YYYY 年 MM 月 DD 日` | `2016年6月22日` → `2016 年 6 月 22 日` |
| `YYYY 年 MM 月DD日` | `YYYY 年 MM 月 DD 日` | `2023 年 2 月2日` → `2023 年 2 月 2 日` |

### 执行日期格式统一化

#### 步骤 1：运行格式分析和生成 SQL

```bash
node tools/normalize-date-formats.js
```

**输出示例**：
```
========================================
Date Format Normalization Script
========================================

Fetching all organizations from database...
Total organizations: 439

Records to update:
  - founded_date: 396
  - go_global_date: 254
  - Total updates: 650

✓ SQL file generated: ./tools/update-date-formats.sql
```

脚本会：
1. 从数据库读取所有组织记录
2. 分析每个日期字段的格式
3. 生成需要更新的 SQL 语句
4. 保存到 `tools/update-date-formats.sql`

#### 步骤 2：审查生成的 SQL 文件

```bash
# 查看前 50 行
head -50 tools/update-date-formats.sql

# 或使用编辑器打开
code tools/update-date-formats.sql
```

**SQL 文件格式**：
```sql
-- Auto-generated date format normalization SQL
-- Generated at: 2026-01-12T10:22:49.913Z
-- Total updates: 650

-- ID 1: founded_date
-- Old: 1985-04-01
-- New: 1985 年 4 月 1 日
UPDATE orgs SET founded_date = '1985 年 4 月 1 日' WHERE id = 1;

-- ID 1: go_global_date
-- Old: 2009
-- New: 2009 年
UPDATE orgs SET go_global_date = '2009 年' WHERE id = 1;
```

每条更新都包含：
- 组织 ID
- 字段名称
- 旧值（注释）
- 新值（注释）
- UPDATE 语句

#### 步骤 3：执行 SQL 更新

**方法 A：使用交互式脚本**（推荐）

```bash
bash tools/execute-date-format-updates.sh
```

脚本会：
1. 检查 SQL 文件是否存在
2. 显示将要执行的更新数量
3. 要求用户确认
4. 执行更新

**方法 B：直接执行**

```bash
npx wrangler d1 execute ngo_going_out --remote --file=./tools/update-date-formats.sql
```

**执行结果示例**：
```
🚣 Executed 650 queries in 12.15ms (650 rows read, 650 rows written)

Total queries executed: 650
Rows read: 650
Rows written: 650
Database size (MB): 0.62
```

#### 步骤 4：验证结果

```bash
# 查询示例记录验证格式
npx wrangler d1 execute ngo_going_out --remote --command="
SELECT id, org_name, founded_date, go_global_date
FROM orgs
WHERE id IN (1, 29, 44, 45)
ORDER BY id;
"
```

**期望输出**：
```json
[
  {
    "id": 1,
    "org_name": "爱德基金会",
    "founded_date": "1985 年 4 月 1 日",
    "go_global_date": "2009 年"
  },
  {
    "id": 29,
    "org_name": "北京同心圆慈善基金会",
    "founded_date": "2016 年 6 月 22 日",
    "go_global_date": "2023 年 2 月 2 日"
  }
]
```

### 相关工具文件

| 文件 | 说明 |
|------|------|
| `tools/normalize-date-formats.js` | 日期格式分析和 SQL 生成脚本 |
| `tools/execute-date-format-updates.sh` | SQL 执行脚本（交互式） |
| `tools/update-date-formats.sql` | 生成的 SQL 更新语句（临时文件） |

### 脚本工作原理

`normalize-date-formats.js` 脚本的核心逻辑：

1. **读取数据**：使用 wrangler 从远程数据库读取所有组织记录
2. **格式检测**：使用正则表达式匹配各种日期格式
3. **格式转换**：根据转换规则生成标准格式
4. **生成 SQL**：为每个需要更新的字段生成 UPDATE 语句
5. **保存文件**：将所有 SQL 语句保存到文件

**关键函数**：
```javascript
function normalizeDate(dateStr) {
  // YYYY.0 格式
  if (/^\d{4}\.0$/.test(trimmed)) {
    return trimmed.replace('.0', ' 年');
  }

  // 纯 YYYY 格式
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed + ' 年';
  }

  // YYYY-MM-DD 格式
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return `${year} 年 ${parseInt(month)} 月 ${parseInt(day)} 日`;
  }

  // ... 其他格式处理
}
```

### 执行历史

#### 2026-01-12：首次批量格式统一化

**执行情况**：
- 总组织数：439
- 更新记录数：651（650 + 1 补充更新）
- 成功率：100%
- 执行时间：约 12ms

**更新统计**：
- `founded_date` 字段：396 条记录
- `go_global_date` 字段：255 条记录

**主要转换**：
- `YYYY` → `YYYY 年`：最常见
- `YYYY-MM-DD` → `YYYY 年 MM 月 DD 日`：日期格式
- `YYYY.0` → `YYYY 年`：Excel 导入格式
- 空格规范化：统一年月日之间的空格

**特殊处理**：
- 保留了所有包含括号说明的日期
- 保留了 `null` 值和占位符 `-`
- 保留了复杂描述（如 id-43 的成立时间）

### 未来维护建议

1. **数据导入时的格式验证**
   - 在导入新数据时，确保日期格式符合规范
   - 使用脚本预处理导入数据

2. **定期格式检查**
   - 定期运行 `normalize-date-formats.js` 检查是否有新的不规范格式
   - 如果输出显示 "Total updates: 0"，说明所有格式都符合规范

3. **格式规范文档化**
   - 在数据录入指南中明确日期格式要求
   - 提供格式示例和常见错误

4. **自动化检查**
   - 可以将格式检查集成到 CI/CD 流程
   - 在数据更新后自动运行验证

### 故障排查

#### 问题：脚本报错 "command not found"

**原因**：脚本没有执行权限

**解决**：
```bash
chmod +x tools/execute-date-format-updates.sh
```

#### 问题：SQL 执行失败

**原因**：可能是网络问题或数据库暂时不可用

**解决**：
1. 检查网络连接
2. 重试执行：`npx wrangler d1 execute ngo_going_out --remote --file=./tools/update-date-formats.sql`
3. 如果持续失败，检查 Cloudflare 服务状态

#### 问题：某些日期格式未被正确转换

**原因**：可能是新的格式模式未被脚本识别

**解决**：
1. 查询该记录：`SELECT * FROM orgs WHERE id = <id>;`
2. 在 `normalize-date-formats.js` 中添加新的格式匹配规则
3. 重新运行脚本

---

**最后更新**：2026-01-12
**维护者**：数据库管理团队
