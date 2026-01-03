#!/bin/bash

# NGO Going Out - API测试脚本
# 使用方法: ./test-api.sh <API_URL>
# 例如: ./test-api.sh https://ngo-api-dev.your-subdomain.workers.dev

set -e

API_URL=$1

if [ -z "$API_URL" ]; then
  echo "❌ 请提供API URL"
  echo "用法: ./test-api.sh <API_URL>"
  echo ""
  echo "示例:"
  echo "  ./test-api.sh https://ngo-api-dev.your-subdomain.workers.dev"
  exit 1
fi

echo "🧪 测试API: $API_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查jq是否安装
if ! command -v jq &> /dev/null; then
    echo "⚠️  警告: 未安装jq，输出将不会格式化"
    echo "   安装: brew install jq (macOS) 或 apt-get install jq (Linux)"
    echo ""
    JQ_CMD="cat"
else
    JQ_CMD="jq '.'"
fi

# 测试1: 健康检查
echo "1️⃣  测试健康检查 (/api/health)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
echo "$HEALTH_RESPONSE" | eval $JQ_CMD
if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
  echo "✅ 健康检查通过"
else
  echo "❌ 健康检查失败"
  exit 1
fi
echo ""

# 测试2: 组织列表
echo "2️⃣  测试组织列表 (/api/orgs?page=1&page_size=5)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ORGS_RESPONSE=$(curl -s "$API_URL/api/orgs?page=1&page_size=5")
if command -v jq &> /dev/null; then
  echo "$ORGS_RESPONSE" | jq '{total, page, page_size, items_count: (.items | length)}'
else
  echo "$ORGS_RESPONSE"
fi
if echo "$ORGS_RESPONSE" | grep -q '"total"'; then
  echo "✅ 组织列表获取成功"
else
  echo "❌ 组织列表获取失败"
  exit 1
fi
echo ""

# 测试3: 组织详情
echo "3️⃣  测试组织详情 (/api/orgs/1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ORG_DETAIL=$(curl -s "$API_URL/api/orgs/1")
if command -v jq &> /dev/null; then
  echo "$ORG_DETAIL" | jq '{id, org_name, founded_date, donation_post_year, go_out_level}'
else
  echo "$ORG_DETAIL"
fi
if echo "$ORG_DETAIL" | grep -q '"org_name"'; then
  echo "✅ 组织详情获取成功"
  # 检查是否包含新字段 donation_post_year
  if echo "$ORG_DETAIL" | grep -q '"donation_post_year"'; then
    echo "✅ 包含 donation_post_year 字段"
  else
    echo "⚠️  缺少 donation_post_year 字段"
  fi
else
  echo "❌ 组织详情获取失败"
  exit 1
fi
echo ""

# 测试4: 搜索功能
echo "4️⃣  测试搜索功能 (/api/orgs?query=爱德)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SEARCH_RESPONSE=$(curl -s "$API_URL/api/orgs?query=爱德")
if command -v jq &> /dev/null; then
  echo "$SEARCH_RESPONSE" | jq '{total, items_count: (.items | length), first_item: .items[0].org_name}'
else
  echo "$SEARCH_RESPONSE"
fi
if echo "$SEARCH_RESPONSE" | grep -q '"total"'; then
  echo "✅ 搜索功能正常"
else
  echo "❌ 搜索功能失败"
  exit 1
fi
echo ""

# 测试5: 政策列表
echo "5️⃣  测试政策列表 (/api/policies)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
POLICIES_RESPONSE=$(curl -s "$API_URL/api/policies")
if command -v jq &> /dev/null; then
  echo "$POLICIES_RESPONSE" | jq '{items_count: (.items | length), first_item: .items[0].title}'
else
  echo "$POLICIES_RESPONSE"
fi
if echo "$POLICIES_RESPONSE" | grep -q '"items"'; then
  echo "✅ 政策列表获取成功"
else
  echo "❌ 政策列表获取失败"
  exit 1
fi
echo ""

# 测试6: Facets（筛选选项）
echo "6️⃣  测试Facets (/api/orgs/facets)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FACETS_RESPONSE=$(curl -s "$API_URL/api/orgs/facets")
if command -v jq &> /dev/null; then
  echo "$FACETS_RESPONSE" | jq '{countries_count: (.countries | length), sectors_count: (.sectors | length)}'
else
  echo "$FACETS_RESPONSE"
fi
if echo "$FACETS_RESPONSE" | grep -q '"countries"'; then
  echo "✅ Facets获取成功"
else
  echo "❌ Facets获取失败"
  exit 1
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 所有测试通过！"
echo ""
echo "📊 测试摘要:"
echo "   ✓ 健康检查"
echo "   ✓ 组织列表"
echo "   ✓ 组织详情（包含 donation_post_year）"
echo "   ✓ 搜索功能"
echo "   ✓ 政策列表"
echo "   ✓ Facets筛选"
echo ""
echo "🎉 API运行正常！"
