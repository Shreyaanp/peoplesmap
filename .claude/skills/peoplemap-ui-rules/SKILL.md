---
name: peoplemap-ui-rules
description: The peoplemap UX golden rules and styling rules. Load before building or changing ANY peoplemap UI (components, screens, CSS Modules, tokens, layout, copy on screen).
---

# peoplemap UI rules

peoplemap is a Google Maps–style app where the pins are people. Simple on the surface, smart underneath.
Product source of truth: CLAUDE.md and the product doc it links.

## The eight golden rules

| Rule                    | Apply it as                                                                                                                                  | Enforced by                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Jakob's Law             | Behave like Google Maps: search on top, pinch to zoom, bottom sheets, back closes the sheet. Don't reinvent familiar gestures.               | Review                      |
| Hick's Law              | At most one or two NEW things on screen at a time. Progressive disclosure over menus.                                                        | Review                      |
| Fitts's Law             | Main actions large and in thumb reach (bottom half on mobile). Touch targets ≥ 44×44px (`--size-touch`).                                     | `e2e/touch-targets.spec.ts` |
| Doherty Threshold       | Every tap gives feedback within 100ms. Results within 400ms, or show progress. Never a frozen screen.                                        | Lighthouse CI, review       |
| Nielsen's 10 heuristics | Visible system status, undo over confirm dialogs, consistency, error prevention, never a dead end (no matches → fly to the nearest cluster). | Review                      |
| Motion with purpose     | Every animation explains where something came from or went. See the `peoplemap-motion` skill.                                                | Review                      |
| Restrained gamification | Celebrate only earned moments: Tag Birth, joining the map, first connection. Everything else stays calm.                                     | Review                      |
| Accessibility           | WCAG 2.1 AA contrast, reduce-motion, full keyboard, screen-reader labels, visible focus.                                                     | `e2e/a11y.spec.ts`, review  |

## Styling rules

- **No Tailwind, no UI kit, no shadcn-style defaults.** Every visible component is ours, written as a CSS Module next to its component.
- **Tokens only.** Colours, shadows, z-index and fonts come from `var(--…)` in `src/tokens/tokens.css`. Raw hex/rgb is allowed only in `src/tokens/`. Stylelint fails the build otherwise.
- Use the TS mirror `src/tokens/index.ts` only where CSS variables can't reach (MapLibre style JSON, canvas/WebGL). Keep both files in sync; `tokens.test.ts` checks this.
- **Never pure black or white.** Text is near-black (`--color-ink`) or off-white in dark mode.
- **Amber is precious.** Use it only for people/glows and the ONE main action on a screen. Everything else is warm grey.
- **Glows are gradients** (`--glow-gradient`: cream core → honey → burnt amber → transparent), never flat circles.
- Frosted glass (`--color-glass` + `--glass-blur`) only on floating chrome such as the search bar and bottom sheets, sparingly.
- One sans-serif family (`--font-sans`, final typeface TBD).
- Design both themes fully: check every screen in light (warm grey) and dark (charcoal with a brown undertone).
- Mobile-first, but the desktop layout must be designed too, not stretched.

## Behaviour borrowed, look owned

Use React Aria hooks (`react-aria` / `react-stately`) for hard accessibility behaviour: comboboxes, dialogs, focus management, live regions. Render our own markup and CSS. Never import a styled component library.

## State placement

| State                                                       | Home                                            |
| ----------------------------------------------------------- | ----------------------------------------------- |
| Map camera, pin positions (per frame)                       | Outside React: MapLibre plus refs, one rAF loop |
| Shareable UI (query, open profile)                          | URL                                             |
| Client UI (sheet height, selection)                         | Zustand with selectors                          |
| Server data                                                 | TanStack Query (mock API via MSW for now)       |
| Rarely-changing settings (theme, reduce-motion, map handle) | React Context                                   |

## Sample data

Hyderabad only. Use real areas: Gachibowli, Madhapur, Kondapur, Banjara Hills.

## Before calling UI done

Run the `peoplemap-ux-review` skill.
