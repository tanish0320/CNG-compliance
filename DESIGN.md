---
version: 1
name: Warm Sand Glassmorphic Mobile
colors:
  primary: "#C1A673"
  on-primary: "#FFFFFF"
  surface: "#FAF7F2"
  surface-alt: "#FFFFFF"
  surface-muted: "#F2EFEA"
  surface-tonal: "#F0EAE1"
  on-surface: "#23201E"
  on-surface-variant: "#8A827A"
  on-surface-strong: "#4A4542"
  border: "#EBE3D5"
  destructive: "#8C4A4A"
  scrim-glass: "rgba(255,255,255,0.6)"
  scrim-glass-soft: "rgba(255,255,255,0.4)"
typography:
  display-lg:
    fontFamily: Raleway
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: 0.01em
  display-md:
    fontFamily: Raleway
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.01em
  headline-lg:
    fontFamily: Raleway
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.015em
  headline-md:
    fontFamily: Raleway
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Raleway
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.01em
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  label-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.01em
  label-uppercase:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.2em
  label-uppercase-sm:
    fontFamily: DM Sans
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.2em
  caption:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
rounded:
  sm: 12px
  md: 20px
  lg: 24px
  xl: 32px
  2xl: 40px
  3xl: 48px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 24px
  card-padding: 20px
  card-padding-lg: 32px
  section-gap: 48px
icons:
  set: solar
  default_variant: linear
  active_variant: bold
  stroke_weight: 1.5px
  default_size: 24px
components:
  card:
    backgroundColor: "{colors.scrim-glass}"
    borderColor: "rgba(255,255,255,0.6)"
    borderWidth: 1px
    boxShadow: "0 12px 40px rgba(209,200,188,0.4)"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-padding}"
    typography: "{typography.body-md}"
    textColor: "{colors.on-surface}"
  card-tonal:
    backgroundColor: "{colors.surface-tonal}"
    border: none
    boxShadow: none
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
    textColor: "{colors.on-surface-strong}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 56px
    paddingX: 28px
    gap: 8px
    iconSize: 20px
    border: none
    boxShadow: "0 8px 20px rgba(193,166,115,0.3)"
  button-secondary:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-uppercase-sm}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.full}"
    height: 56px
    paddingX: 24px
    gap: 8px
    iconSize: 16px
    boxShadow: none
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-uppercase}"
    border: none
    boxShadow: none
    paddingX: 0px
    paddingY: 8px
  button-icon-glass:
    backgroundColor: "{colors.scrim-glass-soft}"
    textColor: "{colors.on-surface}"
    borderColor: "rgba(255,255,255,0.6)"
    borderWidth: 1px
    rounded: "{rounded.full}"
    size: 48px
    iconSize: 22px
    boxShadow: "0 8px 16px rgba(209,200,188,0.3)"
  input-text:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    border: none
    boxShadow: none
    paddingX: 0px
    paddingY: 4px
    focusRingColor: "{colors.primary}"
  chip:
    backgroundColor: "{colors.surface-tonal}"
    textColor: "{colors.on-surface-strong}"
    typography: "{typography.label-uppercase-sm}"
    rounded: "{rounded.full}"
    height: 32px
    paddingX: 14px
    border: none
    boxShadow: none
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-uppercase-sm}"
    rounded: "{rounded.full}"
    height: 32px
    paddingX: 14px
    border: none
    boxShadow: "0 4px 12px rgba(193,166,115,0.25)"
  badge-pill:
    backgroundColor: "rgba(193,166,115,0.1)"
    textColor: "{colors.primary}"
    typography: "{typography.label-uppercase-sm}"
    rounded: "{rounded.full}"
    paddingX: 10px
    paddingY: 4px
    border: none
    boxShadow: none
  avatar:
    backgroundColor: "{colors.surface-tonal}"
    borderColor: "rgba(193,166,115,0.2)"
    borderWidth: 2px
    rounded: "{rounded.full}"
    size: 48px
    boxShadow: none
  list-row:
    backgroundColor: "{colors.scrim-glass}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    borderColor: "rgba(255,255,255,0.6)"
    borderWidth: 1px
    rounded: "{rounded.2xl}"
    paddingX: 16px
    paddingY: 16px
    gap: 16px
    boxShadow: "0 8px 30px rgba(209,200,188,0.3)"
  top-app-bar:
    backgroundColor: "{colors.scrim-glass-soft}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg}"
    borderColor: "rgba(255,255,255,0.4)"
    borderWidth: 1px
    rounded: 0px
    paddingX: 24px
    paddingY: 16px
    boxShadow: none
  tab-bar:
    backgroundColor: "rgba(255,255,255,0.7)"
    borderColor: "rgba(255,255,255,0.5)"
    borderWidth: 1px
    rounded: "{rounded.full}"
    height: 64px
    paddingX: 8px
    boxShadow: "0 16px 40px rgba(209,200,188,0.4)"
  tab-item-active:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    iconSize: 24px
    border: none
    boxShadow: none
  tab-item-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-variant}"
    iconSize: 24px
    border: none
    boxShadow: none
---

# Warm Sand Glassmorphic Mobile

## Overview

**Hushed luxury, sun-warmed neutrals, frosted-glass surfaces.** This is a quiet, editorial aesthetic that feels like a leather-bound concierge folio crossed with a Mediterranean afternoon. The mood is unhurried and confident — nothing shouts, everything whispers.

The system is built from three structural moves: a warm cream page surface that reads as paper, translucent white glass cards that float over photography, and a single restrained tan-gold accent that does all the saturation work. Generous whitespace, light type weights, and tracked-out small caps reinforce a magazine-spread restraint.

The aesthetic is a fit for any high-touch, considered category — premium e-commerce, private wealth, members-only services, hospitality, fine objects, slow-living content — anywhere the brief asks for "expensive but never loud."

## Colors

The palette is light-mode only, anchored on a single warm beige page (`{colors.surface}`) and a single muted gold accent (`{colors.primary}`).

**Chrome roles:**
- `{colors.surface}` (`#FAF7F2`) — the canvas. Warm off-white with a yellow-cream cast, never pure white.
- `{colors.surface-alt}` (`#FFFFFF`) — solid white reserved for inputs, secondary buttons, and small lifted tiles inside cards.
- `{colors.surface-muted}` / `{colors.surface-tonal}` — warm sand tints used for tonal cards, chip fills, and divider backgrounds.
- `{colors.on-surface}` (`#23201E`) — near-black with a brown undertone; primary text.
- `{colors.on-surface-strong}` (`#4A4542`) — secondary heading text on tonal surfaces.
- `{colors.on-surface-variant}` (`#8A827A`) — body subdued text and inactive icons.
- `{colors.border}` (`#EBE3D5`) — hairline divider, only when a separation is genuinely needed.

**Brand role:**
- `{colors.primary}` (`#C1A673`) — muted antique gold. Used for: primary CTAs, active tab icon, single-glyph accent icons inside cards, small uppercase action labels (e.g. "View All"), star ratings, and feature-icon tints. NEVER used as a card background — it appears only as small focal accents and one CTA per screen.

**Glass role (signature):**
- `{colors.scrim-glass}` and `{colors.scrim-glass-soft}` — translucent white at 60% / 40% over a backdrop blur. This is the load-bearing surface treatment for cards, top app bar, tab bar, and overlays on photography.

**Semantic:** `{colors.destructive}` (`#8C4A4A`) — dusty terracotta, used sparingly. No success/warning roles defined; positive states reuse `{colors.primary}`.

**Boundary rule:** the gold and the cream-glass system never trade roles. Gold never becomes a surface; glass never becomes an accent.

## Typography

Three families, each with a precise role:

- **Raleway** (`{typography.display-lg}`, `{typography.display-md}`, `{typography.headline-lg}`, `{typography.headline-md}`, `{typography.headline-sm}`) — light-to-medium weight (400–500), slightly tracked out (`+0.01em` to `+0.015em`). Used for ALL titles and headings. The light weight + positive tracking is the signature; do not bold these.
- **DM Sans** (`{typography.body-md}`, `{typography.body-sm}`, `{typography.label-md}`, `{typography.caption}`) — neutral grotesque for body, button labels, and helper text. Regular 400 for paragraphs, medium 500 for labels.
- **DM Sans tracked uppercase** (`{typography.label-uppercase}`, `{typography.label-uppercase-sm}`) — 10–11px, semibold/bold, letter-spacing `0.2em`, ALL CAPS. Used for: section eyebrows, metadata captions ("DURATION", "CHECK-IN"), small action labels ("VIEW ALL", "RETURN TO HOME"), itinerary day kickers. This tracked-out small-cap is a defining detail — every screen has at least one.

Playfair Display and JetBrains Mono are loaded by the source CSS but are not actually used in any rendered text — treat them as available secondary serif / mono if a brief needs them, but the primary system is Raleway + DM Sans only.

**Weight rule of thumb:** headings stay light (400) or medium (500); body stays regular (400); only tracked-out micro labels go bold (600–700) to compensate for their tiny size.

## Spacing & Layout

Density is **airy**. The page breathes: section gaps are large (`{spacing.section-gap}` = 48px), card interiors are roomy (`{spacing.card-padding-lg}` = 32px on hero cards, 20px on standard), and the screen gutter is `{spacing.gutter}` = 24px.

Vertical rhythm follows a `{spacing.xl}` (32px) → `{spacing.2xl}` (48px) cadence between sections, with `{spacing.lg}` (24px) between sub-blocks within a section. Internal stack gaps inside cards are `{spacing.md}` (16px).

Floating chrome (top app bar, tab bar) sits inset from the screen edges with its own gutter, never edge-to-edge. The tab bar is a floating pill, `bottom-6 inset-x-6`.

## Elevation & Depth

Depth is conveyed by **frosted glass over warm cream**, not stacked shadows. Three tiers:

1. **Page surface** — flat warm cream, no shadow.
2. **Glass card** — translucent white (`bg-white/40` to `bg-white/60`) with `backdrop-blur-xl` or `backdrop-blur-2xl`, a hairline white border (`border-white/60`), and a soft warm-tinted shadow `0 12px 40px rgba(209,200,188,0.4)`. The shadow color matters — it's a warm dusty rose, not neutral grey.
3. **Floating chrome** (tab bar, icon buttons) — same glass treatment with a slightly tighter shadow `0 8px 16px rgba(209,200,188,0.3)` to `0 16px 40px rgba(209,200,188,0.4)`.

Tonal cards (`{components.card-tonal}`) use solid `{colors.surface-tonal}` instead of glass and carry no shadow — used when the card sits in a busy context where another glass layer would muddy the read.

The CTA button gets its own colored shadow `0 8px 20px rgba(193,166,115,0.3)` to lift the gold off the cream — never a neutral grey shadow.

## Shapes

Generous, soft, never harsh. Radii ladder:

- `{rounded.sm}` (12px) — small inline accents (rare).
- `{rounded.md}` (20px) — small image thumbnails inside list rows.
- `{rounded.lg}` (24px) — tonal cards, secondary surfaces.
- `{rounded.xl}` (32px) — standard glass cards, image tiles.
- `{rounded.2xl}` (40px) — hero glass cards, large feature tiles, photo cards.
- `{rounded.3xl}` (48px) — sheet-style overlays (e.g. the lifted detail sheet that overlaps a hero image).
- `{rounded.full}` — all buttons, all chips, all icon buttons, the tab bar, avatars, status dots.

**Rule:** every interactive element is fully rounded (pill or circle); every container is generously rounded (32px+). Sharp corners do not exist in this system except for the page edge itself.

## Components

### card (glass)

The defining surface. Always layered over either the warm page or photography.

```html
<div class="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[40px] p-5 shadow-[0_12px_40px_rgba(209,200,188,0.4)]">
  <h3 class="font-[Raleway] text-2xl tracking-wide text-[#23201E]">[Card title]</h3>
  <p class="font-[DM_Sans] text-sm text-[#8A827A] leading-relaxed mt-2">[Card body text]</p>
</div>
```

### card-tonal

For sub-cards inside another card, or for low-key feature tiles. No shadow, solid warm fill.

```html
<div class="bg-[#F0EAE1] rounded-3xl p-5">
  <p class="text-[10px] uppercase tracking-[0.2em] text-[#8A827A] font-bold mb-1">[Eyebrow]</p>
  <p class="font-[DM_Sans] text-sm font-medium text-[#23201E]">[Value]</p>
</div>
```

### button-primary

Single-color gold pill with a colored shadow. One per screen.

```html
<button class="h-14 px-7 bg-[#C1A673] text-white rounded-full font-[DM_Sans] font-medium tracking-wide flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(193,166,115,0.3)]">
  <iconify-icon icon="solar:[icon-name]-linear" class="size-5"></iconify-icon>
  [Action label]
</button>
```

### button-secondary

White pill with a hairline border and tracked uppercase micro-label. Used in pairs (e.g. action grid).

```html
<button class="h-14 px-6 bg-white border border-[#EBE3D5] rounded-full text-[10px] uppercase tracking-[0.2em] font-bold text-[#23201E] flex items-center justify-center gap-2">
  <iconify-icon icon="solar:[icon-name]-linear" class="size-4"></iconify-icon>
  [Label]
</button>
```

### button-icon-glass (signature)

Floating circular glass control used in headers (back, share, favorite, notifications). The translucency over photography is what makes the aesthetic recognizable in screen captures.

```html
<button class="size-12 rounded-full bg-white/40 backdrop-blur-md border border-white/40 shadow-[0_8px_16px_rgba(209,200,188,0.3)] flex items-center justify-center text-[#23201E]">
  <iconify-icon icon="solar:[icon-name]-linear" class="size-6"></iconify-icon>
</button>
```

### button-text

Tracked uppercase gold link, no background. For "View All" / "See More" affordances.

```html
<button class="text-[11px] uppercase tracking-[0.2em] text-[#C1A673] font-medium">
  [Action]
</button>
```

### input-text

Inputs are NOT bordered boxes — they are transparent fields nested inside a glass card, paired with an uppercase eyebrow label and a circular icon. The card IS the field's visible chrome.

```html
<div class="flex items-center gap-4 p-3 rounded-2xl">
  <div class="size-10 rounded-full bg-[#C1A673]/10 flex items-center justify-center text-[#C1A673] shrink-0">
    <iconify-icon icon="solar:[icon-name]-linear" class="size-5"></iconify-icon>
  </div>
  <div class="flex-1">
    <p class="text-[11px] uppercase tracking-[0.2em] text-[#8A827A] font-medium">[Field label]</p>
    <input type="text" class="w-full bg-transparent border-none p-0 text-base text-[#23201E] placeholder:text-[#8A827A]/50 focus:ring-0 mt-0.5" placeholder="[Placeholder]" />
  </div>
</div>
```

### chip / chip-active

Pill-shaped, tracked uppercase microtype. Active state is solid gold; inactive is warm tonal.

```html
<button class="h-8 px-3.5 rounded-full bg-[#F0EAE1] text-[#4A4542] text-[10px] uppercase tracking-[0.2em] font-bold">[Filter]</button>
<button class="h-8 px-3.5 rounded-full bg-[#C1A673] text-white text-[10px] uppercase tracking-[0.2em] font-bold shadow-[0_4px_12px_rgba(193,166,115,0.25)]">[Active]</button>
```

### badge-pill

Low-saturation gold-on-cream micro-badge.

```html
<span class="inline-block px-2.5 py-1 rounded-full bg-[#C1A673]/10 text-[#C1A673] text-[10px] uppercase tracking-[0.2em] font-bold">[Status]</span>
```

### avatar

Circular with a gold-tinted ring. Padded inside the ring (`p-1`) so the photo sits in a visible halo.

```html
<img src="[url]" class="size-12 rounded-full border-2 border-[#C1A673]/20 p-1" />
```

### list-row

Horizontal glass card with leading thumbnail or icon, body stack, and trailing chevron.

```html
<div class="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[32px] p-4 flex items-center gap-4 shadow-[0_8px_30px_rgba(209,200,188,0.3)]">
  <div class="size-16 rounded-2xl overflow-hidden shrink-0">
    <img src="[image]" class="w-full h-full object-cover" />
  </div>
  <div class="flex-1">
    <h4 class="font-[Raleway] text-lg text-[#23201E] tracking-wide">[Row title]</h4>
    <p class="text-xs text-[#8A827A] mt-0.5">[Meta] • [Meta]</p>
  </div>
  <div class="size-10 rounded-full bg-[#F0EAE1]/50 flex items-center justify-center text-[#4A4542] shrink-0">
    <iconify-icon icon="solar:alt-arrow-right-linear" class="size-5"></iconify-icon>
  </div>
</div>
```

### top-app-bar

Fixed glass bar with a tracked uppercase eyebrow over a Raleway display title on the left, and one or two `button-icon-glass` controls on the right.

```html
<header class="fixed top-0 inset-x-0 z-50 bg-white/40 backdrop-blur-xl border-b border-white/40 pt-14 pb-4 px-6">
  <div class="flex items-center justify-between max-w-md mx-auto">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-[#8A827A] font-medium mb-1">[Eyebrow]</p>
      <h1 class="font-[Raleway] text-2xl tracking-wide text-[#23201E]">[Title]</h1>
    </div>
    <button class="size-12 rounded-full bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_8px_16px_rgba(209,200,188,0.3)] flex items-center justify-center">
      <iconify-icon icon="solar:[icon-name]-linear" class="size-6"></iconify-icon>
    </button>
  </div>
</header>
```

### tab-bar (floating pill)

A signature floating pill nav, glass-backed, four icon-only items. The active item carries the gold tint plus a tiny gold dot beneath the icon — a quieter active indicator than a pill background.

```html
<nav class="fixed bottom-6 inset-x-6 z-50 max-w-md mx-auto">
  <div class="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-full h-16 shadow-[0_16px_40px_rgba(209,200,188,0.4)] flex items-center justify-between px-2">
    <button class="flex-1 flex flex-col items-center justify-center text-[#C1A673]">
      <div class="relative">
        <iconify-icon icon="solar:[icon-name]-bold" class="size-6"></iconify-icon>
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 size-1 bg-[#C1A673] rounded-full"></div>
      </div>
    </button>
    <button class="flex-1 flex flex-col items-center justify-center text-[#8A827A]">
      <iconify-icon icon="solar:[icon-name]-linear" class="size-6"></iconify-icon>
    </button>
    <!-- repeat for remaining tabs -->
  </div>
</nav>
```

### Composition recipes (not separate components)

- **Numbered itinerary / step list** — render as a vertical line with circular nodes (`size-3` solid gold for the active step ringed by `ring-4 ring-primary/10`; `size-2` border-color for upcoming). Each step is `pl-12` from the line, with a tracked-uppercase day eyebrow over a medium body title over a muted body description.
- **Stat divider row** — two or three small flex-col stacks (`label-uppercase-sm` eyebrow over `label-md` value), separated by a `w-px h-6 bg-border` vertical hairline, framed top and bottom by `border-y border-border/50`.
- **Pull quote** — a glass card with a leading `ri:double-quotes-l` glyph in `{colors.primary}/30`, body in Raleway italic at headline-md size, attribution avatar centered below with a tracked-uppercase name and muted role caption.
- **Soft accent CTA card** — a glass-or-tonal card with a single huge blurred gold blob in a corner (`absolute -right-6 -top-6 size-32 bg-primary/20 rounded-full blur-3xl`) behind the content. Use this for a low-pressure invitation, never for a primary action.
- **Photo card with floating glass caption** — a tall photographic tile (40px radius, soft warm shadow) with a `bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl` caption pinned to the bottom inset by 16px, containing title + meta + price + favorite glass-icon-button.

### Tonal recipe

For a low-attention secondary action where `button-secondary`'s hairline feels too crisp, render `button-secondary` with `bg-[#F0EAE1]` and no border instead — same dimensions, softer presence.

## Iconography

- **Set:** `solar` (Iconify). The proportions and slight warmth of solar's terminals match the editorial feel; lucide and heroicons feel too engineered here.
- **Default variant:** `linear` — `solar:[name]-linear` — used for inactive tabs, header controls, all inline icons.
- **Active variant:** `bold` — `solar:[name]-bold` — used for the active tab item AND for the gold star rating glyph.
- **Stroke weight:** solar's default 1.5px linear stroke is correct; do not adjust.
- **Default size:** 24px in chrome (header buttons, tab bar), 20px inline with text labels, 16px in tracked-uppercase contexts and small badges, 12px for inline rating stars.
- **Color usage:** chrome icons inherit `{colors.on-surface}` or `{colors.on-surface-variant}`; only feature-accent icons (the small icon inside an input row, a feature-grid glyph, the rating star, the active tab) use `{colors.primary}`.
- **Quote glyphs** are an exception — the source uses `ri:double-quotes-l` for editorial pull-quotes; that's fine to keep as a one-off glyph from `ri` since solar lacks a comparable typographic mark.

## Illustration & Imagery

This system is **photography-led**. There are no illustrations in the source — all imagery is rich, atmospheric, golden-hour photography of luxury subjects (architecture, interiors, landscapes, transport, hospitality settings). This is a load-bearing aesthetic choice and must be preserved.

- **Style / Technique:** photographic, never illustrated. Cinematic, warm-graded, soft-focus where appropriate. Looks editorial — closer to a Condé Nast Traveler spread than a stock-photo grid. Lighting is overwhelmingly golden hour or warm interior lamp light; midday hard light and cool/blue tones are out.
- **Palette:** every image carries warm amber, honey, gold, terracotta, and dusky cream tones. Greens and blues, when present, are muted and warm-shifted (sage, mossy teal, dusty turquoise). Saturation is moderate — not flat, but never electric. Reject any image with vivid blues, neon greens, cold whites, or harsh contrast.
- **Edge treatment:** none — full-bleed photography inside a rounded container. No outlines, no frames, no inner border.
- **Shading & light:** soft, directional, warm. Visible sun glow, lens haze, soft falloff into shadow. The image often has a single warm light source from the upper third.
- **Composition & framing:** wide, atmospheric, subject-set-in-context (a chair on a terrace with sea behind, a tent in a savanna, a corridor opening onto a garden). Subjects sit inside their environment rather than centered product-shot style. Negative space is welcomed in sky / water / open ground.
- **Background within the image:** a real environment — sea, sky, grassland, garden — never a studio sweep, never a cut-out, never a flat color.
- **Container styling:** photographic tiles use `rounded-[40px]` (`{rounded.2xl}`) for the large hero tiles, `rounded-3xl` (32px) for medium feature tiles, `rounded-2xl` (20px) for small thumbnails (e.g. inside a list row). No border, no inner padding — the image fills the container.
- **CSS treatment on `<img>`:** `object-cover` on every image. No `mix-blend-mode`. No CSS filters. Opacity is 100% by default; the only exception is feature tiles where `opacity-80` is used at rest with a `group-hover:opacity-100` lift, paired with a subtle `scale-105` hover transform on the inner image.
- **Box-shadow on the photo card:** warm-tinted, NOT neutral grey. Hero-scale photo cards: `shadow-[0_16px_40px_rgba(209,200,188,0.5)]`. Medium feature tiles: `shadow-[0_8px_20px_rgba(209,200,188,0.3)]`. The dusty-rose shadow color blending into the cream page is part of the signature.
- **Aspect ratio rule:** hero tiles are tall portrait (~3:4 or 280×380); feature tiles are wide landscape (2:1, ~h-32); thumbnails are square (`size-16`–`size-20`). Always crop to fit; do not letterbox.
- **Gradient overlay on photographic cards:** when text sits on top of an image, layer `bg-gradient-to-b from-transparent via-transparent to-black/60` (or `bg-gradient-to-t from-black/50 to-transparent` for bottom-aligned captions) to keep text legible without dimming the whole image.
- **Anti-references:** NOT illustrated, NOT 3D-rendered, NOT vector, NOT cartoon, NOT pastel, NOT cool/blue-graded, NOT high-contrast, NOT studio cut-out, NOT pop-color saturated, NOT flat-shaded.
- **Style recipe prompt** (for image generation when a brief needs new imagery):

  > *Photographic, editorial-quality image of [SUBJECT] set in a real environment. Golden-hour or warm interior lighting, soft directional sunlight from upper-left, gentle haze and lens warmth. Palette dominated by amber, honey, cream, terracotta, and dusky warm neutrals; any greens or blues muted and warm-shifted. Cinematic depth of field with subject grounded in context — wide enough framing to show environment, never product-on-sweep. Soft falloff into shadow, moderate saturation, no harsh contrast. NOT illustrated, NOT 3D, NOT vector, NOT cartoon, NOT pastel, NOT cool/blue-graded, NOT studio cut-out.*

## Hierarchy & Emphasis

Visual weight is carried by **size, image presence, and the singular gold accent** — not by bold type and not by color saturation. Within any screen:

- The largest type (Raleway 30–36px, light weight) anchors the screen.
- Photography is the second loudest element.
- The gold CTA pill (or single gold accent glyph) is the third — and the only saturated thing on the page.
- Tracked-uppercase metadata always whispers; it carries information without competing.

Body text is intentionally muted (`{colors.on-surface-variant}`) so headings and imagery can lead. Bold weights are reserved for tiny tracked labels — never for headings, never for body.

## Distinctive Details

- **Frosted glass over warm cream** — translucent white surfaces with backdrop blur, hairline white borders, and dusty-rose-tinted shadows. This is the signature surface system, applied to cards, the top app bar, the floating tab bar, and overlay captions on photography.
- **Tracked-out small caps as the connective tissue** — every screen has `letter-spacing: 0.2em` uppercase microtype acting as eyebrows, metadata captions, and small action labels. Without this typographic detail the aesthetic flattens into generic minimalism.
- **The single antique-gold accent** — `#C1A673` is the only saturated color in the system, used surgically: one CTA, the active tab indicator, the rating star, the icon tint inside an input row. The discipline of using exactly one accent color is what makes the cream surfaces read as expensive.
- **Warm-tinted shadows** — every shadow uses `rgba(209,200,188,X)` (dusty rose) or `rgba(193,166,115,X)` (gold). Pure black or neutral grey shadows would break the warmth.

## Do's and Don'ts

### Do

- Use Raleway light/medium for every heading and DM Sans regular for every body paragraph.
- Layer glass cards (`bg-white/40` to `bg-white/70` + `backdrop-blur-xl`) over warm cream or photography.
- Use tracked-uppercase microtype (`tracking-[0.2em]` 10–11px) for eyebrows, metadata, and small action labels.
- Reserve `{colors.primary}` for one CTA per screen, the active tab, and small accent glyphs only.
- Tint shadows warm — `rgba(209,200,188,X)` for chrome, `rgba(193,166,115,X)` for the primary CTA.
- Crop photography warm and golden — sunset, lamp light, sun haze. Never neutral or cool.
- Round generously: 32–48px on cards and image tiles; full-pill on every interactive element.
- Use the `button-icon-glass` floating circle for header controls over photography.

### Don't

- Don't use the gold as a card background or large surface fill — it's an accent, not a surface.
- Don't bold Raleway headings — light/medium is the look; bold breaks the editorial voice.
- Don't use neutral grey shadows — they read industrial and kill the warmth.
- Don't introduce illustrations, vectors, 3D renders, or cartoon imagery — this aesthetic is photography-only.
- Don't use cool-graded, blue-shifted, or high-contrast photography — warm golden tones only.
- Don't add visible borders to inputs — inputs nest inside cards as transparent fields with an icon and an eyebrow label.
- Don't fill chips with the primary color unless they are in active state.
- Don't use multiple saturated colors on one screen — discipline is the point; one accent at a time.
- Don't shrink the radii — anything below 20px on a container reads as wrong for the system.
- Don't use pure white (`#FFFFFF`) as the page surface — the cream `#FAF7F2` is the canvas.
