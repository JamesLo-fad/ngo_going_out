#!/bin/bash
# 网站检查脚本

echo "🌐 NGO 网站检查"
echo "================================"
echo ""

# 检查 Worker API
echo "1️⃣ 检查 API Worker..."
API_URL="https://ngo-api-dev.ngo-going-out.workers.dev"

# 使用 --resolve 解决 DNS 问题
API_IP="172.67.173.29"

echo "   测试健康检查端点..."
HEALTH=$(curl -s --resolve ngo-api-dev.ngo-going-out.workers.dev:443:$API_IP "$API_URL/api/health")
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "   ✅ API 健康检查通过"
else
    echo "   ❌ API 健康检查失败"
    echo "   响应: $HEALTH"
fi

echo ""
echo "   测试组织列表端点..."
ORGS=$(curl -s --resolve ngo-api-dev.ngo-going-out.workers.dev:443:$API_IP "$API_URL/api/orgs?page=1&page_size=5")
ORG_COUNT=$(echo "$ORGS" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
if [ -n "$ORG_COUNT" ]; then
    echo "   ✅ 组织列表端点正常 (共 $ORG_COUNT 条记录)"
else
    echo "   ❌ 组织列表端点失败"
fi

echo ""
echo "   测试政策列表端点..."
POLICIES=$(curl -s --resolve ngo-api-dev.ngo-going-out.workers.dev:443:$API_IP "$API_URL/api/policies?page=1&page_size=5")
if echo "$POLICIES" | grep -q '"items"'; then
    echo "   ✅ 政策列表端点正常"
else
    echo "   ❌ 政策列表端点失败"
fi

echo ""
echo "================================"
echo "2️⃣ 前端部署选项"
echo ""
echo "选项 A: 使用 Python 本地测试"
echo "   cd web"
echo "   python3 -m http.server 8080"
echo "   然后访问: http://localhost:8080"
echo ""
echo "选项 B: 部署到 Cloudflare Pages"
echo "   npx wrangler pages deploy web --project-name=ngo-website"
echo ""
echo "================================"
echo "3️⃣ DNS 注意事项"
echo ""
echo "⚠️  本地 DNS 无法解析 workers.dev 域名"
echo "   解决方案："
echo "   - 修改系统 DNS 为 1.1.1.1 (Cloudflare DNS)"
echo "   - 或在 /etc/hosts 添加："
echo "     $API_IP ngo-api-dev.ngo-going-out.workers.dev"
echo ""
echo "================================"
echo ""
echo "✅ API 检查完成！"
echo "   API URL: $API_URL"
echo "   当前组织数: $ORG_COUNT"
echo ""
