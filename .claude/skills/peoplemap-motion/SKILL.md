---
name: peoplemap-motion
description: The peoplemap motion system ("Liquid World, Crisp Glass"): tokens, easings, springs, reduce-motion fallbacks and how each hero animation is built. Load before writing or changing ANY animation, transition, gesture or map camera movement.
---

# peoplemap motion

Motion matters most in peoplemap. Two personalities, one token source.

## Tokens: never inline a number

- TypeScript: `src/motion/tokens.ts` (`liquid`, `crisp`, `spring`, `fade`, `liquidEasing`)
- CSS: `src/tokens/motion.css` (`--ease-liquid`, `--duration-crisp`, … and `--motion-scale`)
- ESLint rejects literal `duration` / `stiffness` / `damping` / `ease` inside a `transition` prop. Import a token.
- If no token fits, add one to BOTH files. `tokens.test.ts` keeps them in sync.

| Family | Used for                                                           | Feel                    | Values                                                               |
| ------ | ------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------- |
| Liquid | The map: Search Bloom, Zoom Morph, Fly-To, breathing glows, Ripple | Slow start, long settle | 0.6 / 0.9 / 1.2s, `liquid.ease`, `liquid.settle`                     |
| Crisp  | UI glass: buttons, sheets, chips, chat, dropdown                   | Fast out, small spring  | 0.15 / 0.22 / 0.3s, `spring.crisp` (500/30), `spring.sheet` (420/36) |

## Rules

1. **Nothing moves without a reason.** Each animation answers "where did this come from / where did it go?"
2. **Every animation is interruptible.** Prefer springs (velocity-preserving). Map camera: call `map.stop()` before starting a new flight; never queue flights.
3. **Animate only `transform` and `opacity`.** Stylelint (`plugin/no-low-performance-animation-properties`) fails on anything else. No animating width/height/top/left/box-shadow/filter.
4. **Respect reduce-motion.**
   - React: `useMotionTransition(spring.crisp)` returns a fade under reduce-motion. `useReducedMotionPreference()` gives the boolean.
   - CSS: multiply travel distances by `var(--motion-scale)`; stop infinite animations in `@media (prefers-reduced-motion: reduce)`.
   - Map: `flyTo` becomes `jumpTo` plus a cross-fade.
   - `e2e/reduced-motion.spec.ts` fails if any infinite animation still runs.
5. **60fps on a mid-range Android.** GPU for glows, at most 100–150 DOM pins (clustered), one rAF loop for the pin overlay, no layout reads inside animation frames.
6. Load Motion in its slim form (`LazyMotion` + `domAnimation`, `m.` components) to keep the bundle small. Drag and layout features (`domMax`) load asynchronously after first paint.

## Engineering decisions

- **Cheapest engine that can do it:** CSS transitions for hover/press/focus/colour; Motion for sheets, chips, gestures, springs, enter/exit and layout; our frame loop for pin positions, Zoom Morph progress, shader time and glow inertia.
- **One frame clock.** Our loop never calls `requestAnimationFrame` itself; it schedules on Motion's frameloop (`frame.read` → read map camera, `frame.update` → compute positions, `frame.render` → write transforms, CSS variables and shader uniforms). Never read layout in `update`/`render`.
- **Zoom Morph** progress (0–1 from zoom) is written each frame to `--morph` on the overlay root; pin opacity/scale/flip derive from it in CSS. No React renders.
- **Choreography** (e.g. Search Bloom: fly → glows brighten → +300ms ripple → sheet peek) is an async function taking an `AbortSignal`. Starting a new one aborts the previous; every step checks the signal. Interrupted springs hand over velocity. No state-machine library.
- **Camera:** MapLibre `flyTo`/`easeTo` with `liquidEasing()`. Build our own camera animator only if the motion lab shows the handoff from a fling feels wrong.
- **Glass over the map:** while a sheet is dragged or animating, swap `backdrop-filter` for a solid warm tint (`data-moving` attribute); fade the blur back after it settles.
- **`will-change`** only during an animation; remove it afterwards.
- **Reduce-motion** centrally: `MotionConfig reducedMotion="user"` at the root, `--motion-scale: 0` in CSS, camera jump plus crossfade, shader time frozen. Fades remain.
- **Haptics:** `navigator.vibrate` (feature-detected, Android only) when Tag Birth chips land and on Connect. Never elsewhere.
- **Testing:** every hero animation has a Storybook story with a 0.1× slow-mo control and replay; choreography has fake-timer tests for order and cancellation; screenshot tests set `MotionGlobalConfig.skipAnimations`; the Playwright frame trace covers sheet drag over the map and a search bloom.

## Hero animations: how each is built

| Animation                   | Technique                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tag Weather (far zoom)      | Custom WebGL layer: one quad per H3 glow cell, radial cream → honey → burnt gradient, additive blending, `time` uniform plus per-cell phase for breathing. Handles context loss. MapLibre heatmap is the fallback. |
| Zoom Morph: glow → tag pins | Cross-fade the GPU glow out while DOM tag pins spring out from the cluster centre, staggered ~30ms.                                                                                                                |
| Tag pin → face              | 3D flip (rotateY) with `spring.crisp`; backface hidden.                                                                                                                                                            |
| Bubble → profile sheet      | Manual FLIP: measure the bubble rect on tap, animate a flying copy into the sheet's header slot, then swap. Swipe down reverses it.                                                                                |
| Bottom sheet                | Motion drag on the y-axis, snap points, rubber-band past the limits (resistance ~0.3), `spring.sheet` to settle.                                                                                                   |
| Search Bloom + Ripple       | Matching glows brighten first (liquid); related-tag glows follow ~300ms later and fainter.                                                                                                                         |
| Tag Birth                   | Split the sentence into words; tag words animate layout from their text position into chips (`layoutId`), with a small amber pulse on landing.                                                                     |
| Live tags                   | Pulse rate rises as the tag nears expiry; opacity fades over the last 10%.                                                                                                                                         |
| Glow inertia when panning   | Glow overlay lags the camera velocity and springs back. Polish phase.                                                                                                                                              |

## Checklist for any new animation

- [ ] Uses tokens only
- [ ] transform/opacity only
- [ ] Interruptible mid-flight
- [ ] Reduce-motion fallback verified
- [ ] Has a Storybook story (the motion lab)
- [ ] Holds 60fps in a Chrome performance trace with 4× CPU throttling
