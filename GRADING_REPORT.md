# Writing Tools Suite — Comprehensive Grading Report

**Date:** 2026-06-11 · **Method:** Fixed 10-category rubric applied to all 10 tools, the hub, and the shared infrastructure. Each category scored 1–10 with code-level evidence. 10 = production-grade, 5 = functional but rough.

**Letter scale:** A ≥ 9 · A- ≥ 8.5 · B+ ≥ 8 · B ≥ 7 · C ≥ 6 · D ≥ 5 · F < 5

## Rubric Categories

1. **Visual design & polish** — typography, color, spacing, hierarchy, micro-interactions
2. **UX & interaction design** — action feedback, affordances, empty states, undo/confirmation
3. **Accessibility** — semantics, ARIA, keyboard operability, focus, contrast
4. **Mobile/responsive** — media queries, touch targets, safe areas
5. **Performance** — render-blocking CDN deps, asset weight, layout thrash
6. **Suite consistency** — theme mechanism, shared components, brand palette
7. **Code quality** — structure, duplication, escaping (XSS), error handling
8. **State safety** — persistence, revisions, snapshots, cross-tab conflicts
9. **Offline readiness** — network dependence, service-worker coverage
10. **Copy & content** — labels, microcopy, help text

## Report Card

| Unit | Design | UX | A11y | Mobile | Perf | Consist | Code | State | Offline | Copy | **Avg** | **Grade** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Index Hub** | 9 | 9 | 8 | 8 | 8 | 10 | 8 | 9 | 9 | 9 | **8.8** | **A-** |
| **Shared Infra** | 8 | 8 | 7 | 8 | 8 | 10 | 8 | 8 | 9 | 8 | **8.3** | **B+** |
| **Wribbon** | 9 | 8 | 6 | 9 | 8 | 8 | 8 | 8 | 8 | 8 | **8.1** | **B+** |
| **CharacterForge** | 8 | 8 | 7 | 8 | 8 | 9 | 7 | 8 | 9 | 8 | **7.8** | **B** |
| **Courius** | 8 | 8 | 5 | 7 | 7 | 9 | 7 | 9 | 9 | 8 | **7.8** | **B** |
| **Joterie** | 8 | 8 | 6 | 8 | 7 | 8 | 7 | 8 | 9 | 8 | **7.6** | **B** |
| **WitherNaught** | 9 | 8 | 5 | 8 | 6 | 7 | 7 | 8 | 7 | 8 | **7.3** | **B** |
| **FeedbackForm** | 7 | 8 | 7 | 8 | 9 | 5 | 8 | 3 | 9 | 8 | **7.1** | **B** |
| **PaperCut** | 9 | 7 | 4 | 6 | 6 | 8 | 7 | 8 | 7 | 7 | **7.1** | **B** |
| **BeatHive** | 8 | 7 | 6 | 7 | 5 | 7 | 7 | 8 | 5 | 8 | **7.0** | **B** |
| **ThisButThat** | 8 | 7 | 5 | 8 | 7 | 7 | 6 | 7 | 5 | 8 | **6.8** | **C** |
| **Synax** | 7 | 7 | 5 | 8 | 4 | 6 | 6 | 8 | 6 | 7 | **6.6** | **C** |
| **SUITE OVERALL** | 8.2 | 7.8 | 5.9 | 7.8 | 6.9 | 7.8 | 7.2 | 7.7 | 7.7 | 7.9 | **7.5** | **B** |

## Category Profile (suite-wide)

- **Strongest:** Visual design (8.2), copy quality (7.9), UX / mobile / consistency (7.8), state safety & offline (7.7)
- **Weakest:** **Accessibility (5.9)** — the suite's only failing-adjacent category — and **performance (6.9)**, dragged down by CDN-heavy tools

## Key Findings

### 1. Accessibility is the suite-wide weak point (5.9)
- Icon-only buttons lack `aria-label` in nearly every tool (Courius has 11; Joterie, Wribbon, Synax, PaperCut similar)
- BeatHive has zero keyboard operability (no Tab through hexes, no arrow-key pan)
- `contenteditable` surfaces in Courius/ThisButThat/Wribbon mostly unannotated
- WitherNaught has no visible focus indicators; decorative particles not `aria-hidden`
- Color-only signals (medals, flow bar, timer opacity) lack text fallbacks

### 2. Unescaped user/remote content (security)
- **ThisButThat**: Wikipedia API `topic.text`/`topic.description` interpolated into `innerHTML` (~line 691) — remote-content XSS vector
- **CharacterForge**: library entry names concatenated into `innerHTML` (~line 530)
- **BeatHive**: hex cell content rendered without escaping (~line 474)
- `escapeHtml()` exists but is redefined in 4+ files; should be one shared utility used everywhere

### 3. Performance debt is concentrated in three tools
- **Synax** (worst): React + ReactDOM + Babel standalone + Tailwind, all CDN, with in-browser JSX compilation — multi-second LCP penalty
- **BeatHive**: React + Babel + Firebase SDK render-blocking; Firebase fails silently offline
- **PaperCut**: pdf.js + pdf-lib (~350KB) render-blocking and **not** cached by the service worker — offline cold-start fails
- Six tools load Tailwind via CDN (render-blocking, breaks offline cold-start)

### 4. Theme mechanism fragmentation persists
Four mechanisms in use: `data-wt-theme` (hub, CharacterForge, PaperCut, Courius), `data-theme` (Wribbon), `.dark` class (Joterie, Synax, ThisButThat), custom classes (BeatHive, WitherNaught). The shared palette/toast now adapt via luminance sampling, but tool-level standardization on `data-wt-theme` remains the right end-state.

### 5. FeedbackForm is the ecosystem orphan
No localStorage persistence at all (state safety: 3/10 — close the tab, lose the feedback), no theme sync, no shared export/toast integration.

### 6. State safety is a genuine strength
Revisioned saves + cross-tab conflict detection + capped recovery snapshots are consistently implemented across Courius, Wribbon, WitherNaught, BeatHive, Joterie, Synax, ThisButThat, PaperCut. Gaps: silent failure on quota overflow (no user-facing warning), no archive size caps.

## Prioritized Fix List

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | Escape remote/user content at the three `innerHTML` sites (ThisButThat, CharacterForge, BeatHive); centralize `escapeHtml` in a shared util | Security | Low |
| 2 | Add `aria-label` to all icon-only buttons suite-wide; `aria-multiline` on contenteditable editors; `aria-hidden` on decorative particles | A11y | Low |
| 3 | Add persistence to FeedbackForm (mirror Wribbon's pattern) | Data loss | Low |
| 4 | Precache pdf.js/pdf-lib in sw.js; lazy-load them in PaperCut | Perf/offline | Low |
| 5 | Standardize all tools on `data-wt-theme` | Consistency | Medium |
| 6 | Replace Synax's in-browser Babel/React with vanilla JS or a precompiled build | Perf | High |
| 7 | Keyboard navigation for BeatHive's hex grid | A11y | Medium |
| 8 | Touch-event support for PaperCut annotation dragging | Mobile | Medium |
| 9 | Surface localStorage quota failures via toast instead of silent catch | Reliability | Low |
| 10 | Visible focus states + semantic `<dialog>` modals in WitherNaught | A11y | Low |

## Bottom Line

**Suite grade: B (7.5/10).** The hub and shared infrastructure are now the strongest parts of the suite (A-/B+), visual design and state safety are genuinely production-grade, and offline-first architecture is mostly real. What separates this from an A is concentrated and addressable: accessibility labeling (cheap, high-value), three unescaped `innerHTML` sites, FeedbackForm's missing persistence, and the CDN-runtime debt in Synax/BeatHive/PaperCut.
