---
name: peoplemap-ux-review
description: Review checklist to run on every finished peoplemap screen or component before calling it done. Combines the automated gates with the judgement calls CI cannot make. Use after building UI, before committing, or when asked to review peoplemap UX.
---

> Frontend code lives in `web/`; run every npm command from `web/`. The Spring Boot backend in `server/` is written by hand by the user: never write backend code.

# peoplemap UX review

Run all three steps. Report results as a short table: check, pass/fail, evidence.

## 1. Automated gates (must all pass)

```
cd web
npm run typecheck
npm run lint
npm run lint:css
npm test
npm run build
npm run size
npm run test:e2e
```

| Gate                                       | Catches                                                                                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stylelint tokens rules                     | Raw colours, pure #000/#fff, non-token z-index/shadow/font                                                                                                                                |
| Stylelint high-performance-animation       | Animating anything except transform/opacity                                                                                                                                               |
| ESLint motion rule                         | Inline duration/easing/spring numbers                                                                                                                                                     |
| `tokens.test.ts`                           | CSS and TS tokens drifting apart                                                                                                                                                          |
| ESLint context rules                       | Contexts outside `web/src/state/`, exported raw contexts, unstable Provider values                                                                                                        |
| Context unit tests                         | Hooks outside Provider not throwing; action-only readers re-rendering                                                                                                                     |
| `web/e2e/a11y.spec.ts` (axe, light + dark) | Contrast, labels, landmarks                                                                                                                                                               |
| `web/e2e/touch-targets.spec.ts`            | Interactive elements under 44px                                                                                                                                                           |
| `web/e2e/reduced-motion.spec.ts`           | Animations ignoring reduce-motion                                                                                                                                                         |
| size-limit                                 | Bundle growth past budget                                                                                                                                                                 |
| Lighthouse CI (in GitHub Actions)          | Slow first paint, layout shift (errors). Blocking time, TTI and score only warn: headless Chrome draws MapLibre's WebGL on the CPU, so the map is gated by the device frame trace instead |

## 2. Look at it

Launch the app from `web/` (`npm run dev`, or Storybook with `npm run storybook`). Capture it with the browser tool:

- light and dark
- phone (Pixel 7) and desktop widths
- a short recording of each animation

Also run the built-in `design:design-critique` and `design:accessibility-review` skills on the screenshots.

## 3. Judgement checklist (CI cannot check these)

- [ ] **Jakob:** would a Google Maps user know what to do without help?
- [ ] **Hick:** at most one or two new things on screen at once?
- [ ] **Fitts:** is the main action large and in thumb reach?
- [ ] **Amber discipline:** amber used only for people/glows and the one main action?
- [ ] **Motion purpose:** every animation explains where something came from or went?
- [ ] **Calm:** celebration only at earned moments (Tag Birth, joining, first connection)?
- [ ] **Never a dead end:** empty and error states lead somewhere?
- [ ] **Both themes:** dark mode designed, not just inverted?
- [ ] **Personal, not generic:** does anything look like a default UI kit? If yes, redesign it.
- [ ] **Copy:** short, warm, lowercase-friendly. Use `design:ux-copy` for new strings.

The final call on "does it feel beautiful and calm" belongs to the user. Show them the screenshots and recordings.
