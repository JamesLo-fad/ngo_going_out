#!/bin/bash

# Quick test script for R2 logo setup

echo "=== R2 Logo System Test ==="
echo ""

echo "1. Testing CDN Worker..."
curl -I "https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.svg" 2>&1 | grep -E "(HTTP|Content-Type)" || echo "⚠️  CDN not accessible yet (DNS propagating)"
echo ""

echo "2. Testing API response..."
curl -s "https://ngo-going-out.pages.dev/api/orgs/1" | grep -o '"logo_url":"[^"]*"' || echo "⚠️  API not responding"
echo ""

echo "3. Database check..."
npx wrangler d1 execute ngo_going_out --remote --command="SELECT logo_url FROM orgs WHERE id = 1;" 2>&1 | grep "ngo-logo-cdn" && echo "✓ Database updated" || echo "✗ Database not updated"
echo ""

echo "4. R2 bucket check..."
npx wrangler r2 object list ngo-org-logo --remote 2>&1 | grep "org_1.svg" && echo "✓ File exists in R2" || echo "✗ File not found in R2"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for DNS propagation"
echo "2. Visit: https://ngo-going-out.pages.dev/org.html?id=1"
echo "3. Check if logo displays correctly"
echo ""
echo "To upload your own logo:"
echo "  npx wrangler r2 object put ngo-org-logo/org_1.png --file=<your-logo.png> --remote"
echo "  npx wrangler d1 execute ngo_going_out --remote --command=\"UPDATE orgs SET logo_url = 'https://ngo-logo-cdn.ngo-going-out.workers.dev/org_1.png' WHERE id = 1;\""
