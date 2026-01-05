# Deployment Best Practices

**Last Updated**: 2026-01-05
**Status**: Active Policy
**Applies To**: All code changes to production

## Overview

This document defines mandatory practices for deploying code to production. These practices were established after a critical incident on 2026-01-05 where untested code broke the entire website.

**Core Principle**: **Test locally before every deployment. No exceptions.**

## Pre-Deployment Checklist

### ✅ Mandatory Steps (Must Complete All)

Before pushing any code to `main` branch:

- [ ] **Local Browser Testing**
  - Open HTML files in browser
  - Check browser console (F12) for errors
  - Test all modified functionality
  - Verify data loads correctly

- [ ] **Core Functionality Verification**
  - Organization search works
  - Policy search works
  - Detail pages load
  - API calls succeed

- [ ] **JavaScript Validation**
  - No console errors
  - No syntax errors
  - All functions execute
  - Event handlers work

- [ ] **Mobile Testing**
  - Test on mobile viewport (DevTools)
  - Buttons are touch-friendly (min 44px)
  - Layout is responsive
  - No horizontal scroll

- [ ] **Code Review**
  - Review your own changes
  - Check for obvious errors
  - Verify regex patterns
  - Test complex logic

### 📋 Recommended Steps

- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test with slow network (DevTools throttling)
- [ ] Check accessibility (screen reader, keyboard navigation)
- [ ] Verify SEO tags (if applicable)

## Local Testing Procedure

### 1. Start Local Server

```bash
cd web
python3 -m http.server 8000
```

### 2. Open in Browser

```bash
open http://localhost:8000
```

Or visit: http://localhost:8000

### 3. Open Developer Console

- **Chrome/Edge**: F12 or Cmd+Option+I (Mac)
- **Firefox**: F12 or Cmd+Option+K (Mac)
- **Safari**: Cmd+Option+C (Mac, enable Developer menu first)

### 4. Check for Errors

Look for:
- ❌ Red errors in Console tab
- ⚠️ Yellow warnings (review but may be acceptable)
- 🔴 Failed network requests in Network tab

### 5. Test Functionality

**Organization Search**:
1. Page loads without errors
2. Skeleton screen appears briefly
3. Organization cards display
4. Search works (type and see results)
5. Pagination works
6. Click card → detail page loads

**Policy Search**:
1. Page loads without errors
2. Skeleton screen appears briefly
3. Policy list displays
4. Search works
5. Pagination works

**Detail Page**:
1. Breadcrumb shows correct path
2. Organization data displays
3. No "undefined" or "null" text
4. Back button works

## Deployment Workflow

### Option 1: Direct to Main (Simple Changes Only)

**Use When**:
- Fixing typos
- Updating documentation
- Minor CSS tweaks
- No JavaScript changes

**Process**:
```bash
# 1. Make changes
vim web/index.html

# 2. Test locally (mandatory!)
open http://localhost:8000

# 3. Commit and push
git add web/index.html
git commit -m "Fix typo in header"
git push origin main

# 4. Verify deployment
# Wait 2 minutes, then visit https://ngo-going-out.pages.dev
```

### Option 2: Feature Branch (Recommended for All Changes)

**Use When**:
- Adding new features
- Modifying JavaScript
- Changing API calls
- Multiple file changes
- Any complex changes

**Process**:
```bash
# 1. Create feature branch
git checkout -b feature/improve-search

# 2. Make changes
vim web/index.html

# 3. Test locally (mandatory!)
open http://localhost:8000

# 4. Commit to feature branch
git add web/index.html
git commit -m "Improve search functionality"
git push origin feature/improve-search

# 5. Test on preview deployment
# Cloudflare creates preview URL automatically
# Visit: https://feature-improve-search.[hash].ngo-going-out.pages.dev

# 6. If working, merge to main
git checkout main
git merge feature/improve-search
git push origin main

# 7. Verify production deployment
# Visit: https://ngo-going-out.pages.dev
```

## Common Mistakes to Avoid

### ❌ Don't Do This

1. **Push without testing**
   ```bash
   git add .
   git commit -m "improvements"
   git push origin main  # ❌ NO! Test first!
   ```

2. **Make too many changes at once**
   ```bash
   # ❌ Changed 10 files, added 5 features
   git add .
   git commit -m "various improvements"
   ```

3. **Use complex regex without testing**
   ```javascript
   // ❌ Untested complex regex
   const regex = /[.*+?^${}()|[\\]\\\\]/g;
   ```

4. **Ignore console errors**
   ```
   Console: "Uncaught SyntaxError..."
   You: "Probably fine, let's deploy!" ❌
   ```

5. **Skip mobile testing**
   ```
   "Works on my laptop, ship it!" ❌
   ```

### ✅ Do This Instead

1. **Always test before pushing**
   ```bash
   # Test in browser first
   open http://localhost:8000
   # Check console for errors
   # Test functionality
   # Then commit and push
   ```

2. **Make incremental changes**
   ```bash
   # Change one thing
   git commit -m "Add loading skeleton"
   # Test
   # Change another thing
   git commit -m "Add error handling"
   # Test
   ```

3. **Test regex separately**
   ```javascript
   // Test in browser console first
   const regex = /[.*+?^${}()|[\]\\]/g;
   console.log('test'.replace(regex, '\\$&'));
   // If it works, use it in code
   ```

4. **Fix all console errors**
   ```
   Console: "Uncaught SyntaxError..."
   You: "Must fix before deploying!" ✅
   ```

5. **Always test mobile**
   ```
   F12 → Toggle device toolbar → Test on mobile viewport ✅
   ```

## Rollback Procedure

If deployment breaks production:

### Quick Rollback (Cloudflare Dashboard)

1. Go to https://dash.cloudflare.com
2. Pages → ngo-going-out → Deployments
3. Find last working deployment
4. Click "Rollback to this deployment"
5. Confirm

### Git Revert (Permanent Fix)

```bash
# Find the bad commit
git log --oneline

# Revert it
git revert <commit-hash>

# Push revert
git push origin main
```

### Emergency: Force Push Previous Version

```bash
# ⚠️ Use only in emergency!
git reset --hard <last-good-commit>
git push --force origin main
```

## Testing Specific Features

### Testing JavaScript Changes

```javascript
// Add temporary console.log for debugging
console.log('Function called with:', param);

// Test in browser console
// Remove console.log before committing
```

### Testing Regex Patterns

```javascript
// Test in browser console
const pattern = /[.*+?^${}()|[\]\\]/g;
const test = 'test$string';
console.log(test.replace(pattern, '\\$&'));
// Expected: "test\\$string"
```

### Testing API Calls

```javascript
// Check Network tab in DevTools
// Verify:
// - Request is sent
// - Status is 200
// - Response contains data
// - No CORS errors
```

### Testing Error Handling

```javascript
// Temporarily break API to test error handling
const API_BASE = "https://invalid-url.com";
// Verify error message displays correctly
// Restore correct URL before committing
```

## Monitoring After Deployment

After pushing to production:

1. **Wait 2 minutes** for deployment to complete

2. **Visit production site**
   ```
   https://ngo-going-out.pages.dev
   ```

3. **Check Cloudflare Dashboard**
   - Verify deployment status is "Success"
   - Check build logs for warnings

4. **Test core functionality**
   - Load organization list
   - Search for something
   - Click a detail page
   - Check console for errors

5. **Monitor for 5 minutes**
   - Watch for user reports
   - Check error rates (if monitoring set up)
   - Be ready to rollback if needed

## When Things Go Wrong

### If Deployment Fails

1. **Check build logs** in Cloudflare Dashboard
2. **Look for error message**
3. **Common causes**:
   - File too large (>25 MiB)
   - Syntax error in wrangler.toml
   - Missing dependencies

### If Site Breaks After Deployment

1. **Immediately rollback** (see Rollback Procedure above)
2. **Check browser console** for errors
3. **Check Network tab** for failed API calls
4. **Fix locally and test** before redeploying
5. **Document the incident** in `.claude/issues/`

## Code Review Guidelines

When reviewing your own code:

### JavaScript

- [ ] No syntax errors
- [ ] All variables defined
- [ ] Functions return expected values
- [ ] Error handling present
- [ ] No console.log left in code
- [ ] Regex patterns tested

### HTML

- [ ] Valid HTML structure
- [ ] No unclosed tags
- [ ] Quotes properly escaped
- [ ] Accessibility attributes present

### CSS

- [ ] No syntax errors
- [ ] Mobile responsive
- [ ] No hardcoded sizes (use relative units)
- [ ] Consistent with existing styles

## Tools and Resources

### Testing Tools

- **Browser DevTools**: F12 (Chrome, Firefox, Edge)
- **Mobile Testing**: DevTools device toolbar
- **Regex Testing**: https://regex101.com
- **HTML Validation**: https://validator.w3.org
- **Accessibility**: Chrome Lighthouse

### Useful Commands

```bash
# Start local server
cd web && python3 -m http.server 8000

# Check git status
git status

# View recent commits
git log --oneline -10

# View changes before committing
git diff

# Test JavaScript syntax (limited)
node -c script.js

# Kill local server
pkill -f "python3 -m http.server"
```

## Summary

**Golden Rule**: **If you haven't tested it in a browser, don't deploy it.**

**Remember**:
1. Test locally first
2. Check console for errors
3. Verify core functionality
4. Make small changes
5. Be ready to rollback

**When in doubt**:
- Test more
- Ask for review
- Use feature branch
- Deploy during low-traffic hours

---

**Policy Established**: 2026-01-05
**Last Incident**: 2026-01-05 (UI improvements broke functionality)
**Next Review**: 2026-02-05

**Maintained By**: Development Team
