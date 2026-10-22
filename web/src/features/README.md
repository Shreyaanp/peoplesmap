# Features

One folder per feature. Each owns its components, hooks, store slice and CSS Modules.

| Folder       | Owns                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `map`        | MapLibre controller, glow layer, pin overlay, camera motion          |
| `search`     | Search bar behaviour, tag dropdown, natural-language parsing, Ripple |
| `profile`    | Profile sheet, bubble-to-sheet morph, Connect                        |
| `onboarding` | Describe yourself, Tag Birth, join the map                           |
| `chat`       | Chats and Glows                                                      |

Shared building blocks live in `src/ui`; tokens in `src/tokens`; motion tokens and hooks in `src/motion`.
