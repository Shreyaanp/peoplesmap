# PeopleMap

A Google Maps–style web app where the pins are **people, not places**. People describe themselves with interest hashtags; anyone can search a tag and see people who share it on the map.

Full product doc (source of truth): https://claude.ai/artifact/YLH17vbMtW6EhZg1vK2LrX

## Core principles
- Simple on the surface, smart underneath. Never more than one or two new things on screen at a time.
- Follow familiar Google Maps conventions: search bar on top, bottom sheets for results and profiles.
- Mobile-first web app; desktop layout designed just as fully. Installable to home screen.
- Launch city: **Hyderabad only**. Use real Hyderabad areas (Gachibowli, Madhapur, Kondapur, Banjara Hills) in sample data.

## Tag system
- **Describe yourself:** user writes one sentence; tags are generated from it and editable.
- **Smart hybrid input:** free typing, with suggestions from existing tags.
- **Local-aware dropdown:** suggestions show how many people nearby use each tag (e.g. "#badminton · 340 near Gachibowli").
- **Smart merging:** similar tags (#photo / #photography / #photographer) count as one for matching.
- **Tag levels:** each tag is Learning / Doing / Teaching.
- **Live tags:** temporary "right now" tags; user picks duration (1h / 3h / until tonight / 24h). Pulse faster, fade near expiry.
- **Unlimited tags** per person; map pins show only the top few.

## Search & discovery
- App opens **search-first**: clean map + big search bar.
- Hashtag search and natural-language search ("someone to trek with this weekend near Hyderabad" → tags + area + time).
- Related-tag ripple: fainter glows for related tags, appearing a beat later.
- Never a dead end: no nearby matches → fly the map to the nearest cluster.
- "More like this person": search by someone's whole tag set.
- Experimental (off by default): category colours for combo searches.

## Map: 3-level zoom
| Zoom | Shows | Transition |
|---|---|---|
| Far (country/city) | Tag Weather: amber glow clouds | Glow breathes apart into tag pins |
| Mid (area) | Tag pins: person as floating top tags | Tag pin flips to reveal face |
| Close (street) | Photo bubbles | Tap lifts bubble into profile sheet |

## Onboarding (sign-up only when joining the map)
1. Arrive: living amber map, "Find your people." No login wall.
2. Explore freely; profiles visible but blurred.
3. Describe yourself in one text box.
4. Tag Birth: words lift off and click into chips.
5. Join: "Put yourself on the map?" One-tap sign-up (Google or phone — to be confirmed) + set location (exact or neighbourhood).
6. Your glow appears; nearby matching glows brighten.
7. First results already showing.

## Profile card
Photo-first bottom sheet grown from the map bubble. Name, area, live-tag dot, tag chips (shared tags glow amber, level labels), Connect + Chat buttons. Swipe down to shrink back into the bubble.

## Connect & chat
- Connect is **one-way** (like an Instagram follow).
- Messages from people you've connected to → **Chats** (main DMs).
- Messages from anyone else → **Glows** folder. Connecting back or replying moves the thread to Chats.
- Anti-spam / safety: deferred.

## Visual theme: "Grey World, Colorful People"
- Warm grey base map (light) / charcoal with brown undertone (dark). Both modes designed fully.
- One signature colour: **warm amber**. Used only for people/glows and the one main action button.
- Glows are gradients: cream core → honey amber → burnt amber → transparent. Never flat circles.
- Text: near-black / off-white, never pure black or white.
- Subtle frosted-glass bottom sheets, used sparingly. One clean sans-serif typeface.
- Wordmark: lowercase "peoplemap" with an amber glow dot as the "o" in "people".

## Motion: "Liquid World, Crisp Glass" (motion matters most)
- **Liquid (map):** slow start, long settle, ~0.6–1.2s. Search Bloom, Zoom Morph, Fly-To, breathing glow, Ripple. Glows have slight inertia when panning.
- **Crisp (UI):** fast out, small spring, ~0.15–0.3s. Buttons, sheets, chips, chat, dropdown. Bottom sheet stretches past its limit and springs back.
- Rules: nothing moves without a reason; every animation interruptible; respect reduce-motion (fall back to fades).

## Deferred
- Anti-spam and safety (blocking, reporting, fake profiles)
- Category colours for combo search (experimental)