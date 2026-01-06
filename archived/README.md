# Archived Files

This folder contains files that are not currently used in the deployment but are kept for reference.

## Contents

- **policies.html** - Policy search page (hidden from navigation)
- **policies.js** - API endpoint for policies (not deployed)

## Why These Files Are Archived

As of 2026-01-06, the project focus has shifted to only display the organization section. The policies search functionality has been temporarily hidden from the user interface but the code is preserved here for potential future use.

## How to Restore

If you need to restore the policies functionality:

1. Move `policies.html` back to the project root
2. Move `policies.js` back to `functions/api/`
3. Update navigation in `index.html` and `org.html` to include the policies link
4. Ensure `_routes.json` includes `/api/policies` route (it should already be there)

## Notes

- The policies data is still in the database
- The API endpoint code is functional
- Only the frontend access has been removed
