# Issue: Conditional Rendering Failures

**Date**: 2026-01-05
**Status**: Resolved (via alternative approach)
**Severity**: High (broke production website)

## Problem Summary

Two attempts to implement conditional rendering of empty fields in `policies.html` both resulted in complete page failures, displaying "加载失败" (load failed) error.

## Timeline

### First Attempt (Commit baff1f2)
- **Goal**: Hide empty `issuer_2-4` fields using conditional rendering
- **Approach**: Added inline conditionals in template string
- **Result**: ❌ Policies page broke
- **User Feedback**: "why 加载失败 this time, before it is all good"

### Second Attempt (Commit 39d3013)
- **Goal**: "Safer" implementation using pre-computed boolean flags
- **Approach**: Calculate `hasDate`, `hasDocType`, etc. before rendering
- **Result**: ❌ BOTH org and policies pages broke
- **User Feedback**: "now org and policies all become 加载失败, please fix it, and remember when the website work, do not change the code that can be worked"

### Recovery (Commit aceb7a0)
- **Action**: `git reset --hard aceb7a0` to last working version
- **Result**: ✅ Both pages restored
- **Lesson**: "do not change the code that can be worked"

## Root Causes

### Technical Issues

1. **Template String Complexity**
   - Nested template literals are error-prone
   - Multiple conditional expressions hard to debug
   - JavaScript errors don't show clear stack traces in browser

2. **Function Call Duplication**
   - First attempt called `mergeAgencies(p)` twice
   - May have caused evaluation issues or side effects

3. **Scope Issues**
   - Variables defined in template string have complex scope
   - Boolean flags may not have been accessible where needed

4. **No Local Testing**
   - Changes deployed directly to production
   - No way to catch errors before users saw them

### Process Issues

1. **Wrong Problem Definition**
   - Treated as a "display problem" when it was a "data quality problem"
   - Should have questioned why data had empty strings in first place

2. **Insufficient Testing**
   - No local development environment testing
   - No preview deployment testing
   - Deployed directly to production

3. **Complexity Creep**
   - Started simple, became complex quickly
   - Should have stopped and reconsidered approach

## Why It Failed

### First Attempt Analysis

**Code Pattern** (reconstructed):
```javascript
container.innerHTML = policies.map(p => {
  const agencies = mergeAgencies(p);
  return `
    <div>
      ${agencies !== '-' ? `
        <div>🏛️ 发布单位：${mergeAgencies(p)}</div>
      ` : ''}
    </div>
  `;
}).join('');
```

**Problems**:
- Called `mergeAgencies(p)` twice
- Nested template literals
- Conditional logic in template string

### Second Attempt Analysis

**Code Pattern** (reconstructed):
```javascript
container.innerHTML = policies.map(p => {
  const hasDate = p.published_date && p.published_date !== '-';
  const hasDocType = p.doc_type && p.doc_type !== '-';
  const hasAgencies = mergeAgencies(p) !== '-';

  return `
    <div>
      ${hasDate ? `<div>📅 发布日期：${p.published_date}</div>` : ''}
      ${hasDocType ? `<div>📄 文件类型：${p.doc_type}</div>` : ''}
      ${hasAgencies ? `<div>🏛️ 发布单位：${mergeAgencies(p)}</div>` : ''}
    </div>
  `;
}).join('');
```

**Problems**:
- Still called `mergeAgencies(p)` twice (in condition and in template)
- Complex boolean logic
- Somehow affected org.html too (unclear why)

## Impact

### User Impact
- **Downtime**: Website showed "加载失败" error
- **Frustration**: User had to ask for fixes twice
- **Trust**: User lost confidence in making frontend changes

### Development Impact
- **Time Lost**: Multiple hours debugging and reverting
- **Code Churn**: Three commits that had to be reverted
- **Momentum**: Slowed down progress on actual goal

### Learning Impact
- **Valuable Lesson**: Sometimes the right solution is not to change the code
- **Process Improvement**: Need better testing workflow
- **Approach Shift**: Consider data-level solutions first

## Solution

**Chose different approach**: Data source cleansing instead of frontend changes.

See: `.claude/decisions/data-cleansing-approach.md`

## Prevention Strategies

### 1. Local Testing Environment

**Setup**:
```bash
cd web
npx wrangler pages dev . --d1 database=ngo_going_out_dev
```

**Benefits**:
- Test changes before deployment
- See errors immediately
- No risk to production

### 2. Preview Deployments

**Process**:
1. Create feature branch
2. Push to GitHub
3. Cloudflare creates preview URL
4. Test preview before merging

### 3. Incremental Changes

**Approach**:
- Change one thing at a time
- Test after each change
- Commit working states frequently

### 4. Consider Alternatives First

**Questions to ask**:
- Is this a display problem or a data problem?
- Can we solve it without changing working code?
- What's the simplest solution?
- What are the risks?

### 5. Feature Flags

**Implementation**:
```javascript
const ENABLE_CONDITIONAL_RENDERING = false; // Feature flag

if (ENABLE_CONDITIONAL_RENDERING) {
  // New code
} else {
  // Old code
}
```

**Benefits**:
- Easy rollback
- Gradual rollout
- A/B testing possible

## Lessons Learned

### Technical Lessons

1. **Template Strings Are Fragile**
   - Complex logic doesn't belong in templates
   - Pre-compute values outside template
   - Keep templates simple and declarative

2. **Function Calls in Templates**
   - Avoid calling functions multiple times
   - Cache results in variables
   - Be aware of side effects

3. **Error Handling**
   - JavaScript errors in templates fail silently
   - Add try-catch around rendering code
   - Log errors for debugging

### Process Lessons

1. **Test Before Deploy**
   - Always test locally first
   - Use preview deployments
   - Never deploy untested code to production

2. **Question the Approach**
   - Is this the right solution?
   - Are we solving the right problem?
   - What are simpler alternatives?

3. **Respect Working Code**
   - "If it ain't broke, don't fix it"
   - User's principle: "do not change the code that can be worked"
   - Consider data-level solutions before code changes

### User Communication Lessons

1. **Listen to Feedback**
   - User said "learn from the last time"
   - User emphasized stability over features
   - User suggested data-level solution

2. **Acknowledge Mistakes**
   - Admit when approach isn't working
   - Be willing to try different solutions
   - Document failures for learning

## Related Issues

- **Schema Mismatch** (`.claude/issues/schema-mismatch.md`) - Production database missing fields
- **Data Quality** - Empty strings instead of NULL values

## References

- **Recovery Report**: `.claude/sessions/2026-01-05-recovery.md`
- **Data Cleansing Report**: `.claude/sessions/2026-01-05-data-cleansing.md`
- **Decision Record**: `.claude/decisions/data-cleansing-approach.md`

## Future Recommendations

### If Frontend Changes Are Needed

1. **Use a Framework**
   - Consider Vue.js or React for complex UIs
   - Better error handling and debugging
   - Component-based architecture

2. **Separate Logic from Templates**
   ```javascript
   function renderPolicy(policy) {
     const fields = [];

     if (policy.published_date) {
       fields.push({ label: '📅 发布日期', value: policy.published_date });
     }

     if (policy.doc_type) {
       fields.push({ label: '📄 文件类型', value: policy.doc_type });
     }

     const agencies = mergeAgencies(policy);
     if (agencies !== '-') {
       fields.push({ label: '🏛️ 发布单位', value: agencies });
     }

     return fields.map(f => `<div>${f.label}：${f.value}</div>`).join('');
   }
   ```

3. **Add Error Boundaries**
   ```javascript
   try {
     container.innerHTML = policies.map(renderPolicy).join('');
   } catch (error) {
     console.error('Rendering error:', error);
     container.innerHTML = '<div>加载失败，请刷新页面</div>';
   }
   ```

### If Data Changes Are Needed

1. **Always prefer data-level solutions**
2. **Test on dev database first**
3. **Verify with sample queries**
4. **Document schema changes**

---

**Last Updated**: 2026-01-05
**Author**: Claude Code
**Status**: Documented and Resolved
