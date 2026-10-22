# Icons

We own our icons. `scripts/icons.ts` (`npm run icons`) copies the Phosphor icons we use from
`@phosphor-icons/core` (MIT) into `svg/{light,regular,duotone}/` and generates one typed React
component per icon into `generated/`. Never edit `generated/` by hand: change an SVG or the list in
the script and re-run it.

- Colour: `currentColor`. Active state: set `--icon-duotone-fill: var(--color-accent)` on a duotone icon.
- Size: `size="sm" | "md" | "lg"` maps to `--size-icon-sm`, `--size-icon`, `--size-icon-lg`.
- Accessibility: hidden from screen readers by default. Pass `label` only when the icon carries meaning
  on its own; an icon-only button gets its name from the button's `aria-label`.
- The final weight (light, regular or duotone) is chosen together with the typeface in the
  `Specimen/` Storybook stories.

## Signature icons (to be hand-drawn)

These four are peoplemap-specific and no icon set has them. They will live next to `Icon.tsx`
as hand-drawn components with the same props and path-level Motion animation:

| Icon        | Meaning                               | Animation idea                    |
| ----------- | ------------------------------------- | --------------------------------- |
| Glow        | A person or cluster on the map        | Breathes like the map glows       |
| Live dot    | Someone has a live "right now" tag    | Pulse speed follows time left     |
| Connect     | One-way connect (follow)              | Draws itself on tap               |
| Glows inbox | Messages from people you don't follow | Soft amber glow when there's news |

Until then the generated `ConnectIcon` (Phosphor user-plus), `LiveIcon` (broadcast) and
`InboxIcon` (tray) stand in.
