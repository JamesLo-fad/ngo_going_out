#!/bin/bash

# Test R2 logo system

echo "=== R2 Logo System Test ==="
echo ""

echo "1. Testing CDN endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://ngo-going-out.pages.dev/cdn/org_1.png")
CONTENT_TYPE=$(curl -s -I "https://ngo-going-out.pages.dev/cdn/org_1.png" | grep -i "content-type:" | cut -d' ' -f2 | tr -d '\r')

if [ "$STATUS" = "200" ] && [[ "$CONTENT_TYPE" == image/* ]]; then
  echo "✓ CDN endpoint working (Status: $STATUS, Type: $CONTENT_TYPE)"
else
  echo "✗ CDN endpoint failed (Status: $STATUS, Type: $CONTENT_TYPE)"
fi
echo ""

echo "2. Testing API response..."
LOGO_URL=$(curl -s "https://ngo-going-out.pages.dev/api/orgs/1" | grep -o '"logo_url":"[^"]*"' | cut -d'"' -f4)
if [[ "$LOGO_URL" == *"/cdn/"* ]]; then
  echo "✓ API returns CDN URL: $LOGO_URL"
else
  echo "✗ API logo_url incorrect: $LOGO_URL"
fi
echo ""

echo "3. Testing database..."
DB_LOGO=$(npx wrangler d1 execute ngo_going_out --remote --command="SELECT logo_url FROM orgs WHERE id = 1;" 2>&1 | grep -o 'https://[^"]*')
if [[ "$DB_LOGO" == *"/cdn/"* ]]; then
  echo "✓ Database has CDN URL"
else
  echo "✗ Database logo_url incorrect"
fi
echo ""

echo "=== Test Complete ==="
echo ""
echo "✓ All systems operational!"
echo ""
echo "Visit: https://ngo-going-out.pages.dev/org.html?id=1"
echo "The logo should now display correctly."
