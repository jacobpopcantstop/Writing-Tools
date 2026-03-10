# Writing Tools Audit Checklist

Run audits in this order.

## 1. Smoke Regression

- Run `./scripts/smoke-suite.sh`
- Confirm all core apps load
- Confirm console stays clean
- Confirm persistence and snapshot restore paths still work

## 2. Character Forge UI Audit

- Open `CharacterForge.html`
- Confirm the first screen feels like a tool, not a landing page
- Confirm inputs are immediately visible without extra explanation
- Confirm button labels are concise and readable
- Confirm results, favorites, and snapshots remain understandable

## 3. Responsive Audit

- Serve locally with `python3 -m http.server 8017`
- Check `index.html` on desktop and mobile widths
- Check `CharacterForge.html` on desktop and mobile widths
- Confirm no clipped controls, overflow, or stacked-button issues

## 4. Accessibility Audit

- Confirm zoom is not blocked
- Confirm icon-only buttons have `aria-label`
- Confirm tab order is usable
- Confirm visible focus states exist
- Confirm text contrast is acceptable
- Confirm reduced-motion handling exists where needed

## 5. Console Audit

- Open the suite pages in a browser
- Check for JavaScript errors
- Check for missing asset or CDN failures
- Check for storage or parsing errors

## 6. Persistence And Recovery Audit

- Confirm drafts persist after refresh
- Confirm favorites persist after refresh
- Confirm clearing state creates recovery snapshots where expected
- Confirm snapshot restore succeeds

## 7. Security Audit

- Review `innerHTML` usage
- Review any user-controlled content inserted into the DOM
- Prefer `textContent` or escaped output paths
- Re-check previously flagged XSS-prone areas in the suite

## 8. Dependency Audit

- Find unpinned CDN references such as `@latest`
- Pin CDN versions where possible
- Confirm shared script references are consistent across tools

## 9. PWA Audit

- Confirm `manifest.webmanifest` loads
- Confirm `sw.js` registers cleanly
- Confirm the app shell still works offline at a basic level

## 10. Cross-Suite Consistency Audit

- Confirm theme behavior is consistent
- Confirm shared commands/palette still work
- Confirm recent sessions still populate
- Confirm export and handoff actions still behave consistently
