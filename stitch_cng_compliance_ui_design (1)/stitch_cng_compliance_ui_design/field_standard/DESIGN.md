---
name: Field Standard
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f493f'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#854600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a95b00'
  on-tertiary-container: '#fff1e9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
  code-plate:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.12em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered specifically for outdoor industrial utility, hazardous liquid logistics, and fuel safety compliance. The operational context requires immediate comprehension under extreme glare, direct sunlight, and amidst distracting field environments. 

The aesthetic adheres strictly to Swiss Utilitarianism: clarity over ornamentation, rigorous structural alignment, high-contrast visual cues, and zero synthetic lighting or decorative gradients. The visual language conveys institutional trust, forensic precision, and authoritative compliance. Interfaces are functional instruments rather than entertainment platforms, prioritizing rapid scanning, definitive pass/fail states, and physical verification metaphors (such as standardized vehicle compliance plates).

## Colors

The palette is anchored by a high-contrast neutral base designed for harsh outdoor illumination: pure `#FFFFFF` background for canvas areas with structural grounding in `#F8FAFC` and `#F1F5F9`. Primary text, crucial data points, and structural icons utilize `#0F172A` (Slate 900), providing an uncompromising WCAG AAA contrast ratio against light surfaces.

Functional states are mapped directly to industrial safety archetypes:
- **Primary / Safe / Passed:** `#15803D` (Forest Emerald). Used for positive certifications, safe operating envelopes, and valid validation stamps.
- **Secondary / Technical Identifier:** `#1E40AF` (Industrial Cobalt). Dedicated to registration codes, hardware sensor telemetry, and non-critical active interactive affordances.
- **Critical / Danger / Rejected:** `#DC2626` (Safety Red). Exclusively reserved for hazardous leaks, failed safety checks, and immediate operational halt triggers.
- **Warning / Advisory:** `#D97706` (Amber Ochre). Applied to pending calibration, expiring permits, and non-blocking maintenance flags.
- **Dividers & Structural Borders:** `#E2E8F0` and `#CBD5E1`. Used for sharp containment outlines and tabular boundaries without causing visual noise.

## Typography

Typography balances authoritative institutional clarity with dense data legibility. `Public Sans` commands headers, operational section dividers, and formal certification banners. Its squared, open apertures provide uncompromised readability across varied display glass reflections. `Inter` governs all narrative data, checklists, operational inputs, and dense telemetry tables, chosen for its neutral tone and robust tall x-height.

The dedicated `code-plate` style is optimized for industrial identifiers, vehicle registration numbers, and tank chassis markings. It features tabular alignment, wide tracking, and heavy weights to replicate the stamped physical legibility of official vehicle compliance plates.

## Layout & Spacing

Layout geometry follows an exact 4px/8px incremental grid. Interfaces adhere to a fluid single-column layout on handheld mobile terminals, expanding into a rigid 12-column structure on ruggedized field tablets. 

Touch targets must never dip below 48x48px to accommodate gloved operation in wet or hazardous terminal zones. Horizontal outer margins are maintained at 12px (`0.75rem`) on ultra-compact rugged screens and 16px (`1rem`) on standard mobile displays, preserving screen real estate while protecting against edge-distortion on rubberized casing bumpers. Content flows logically via vertical stacks: identification always leads, followed by telemetry blocks, status verification matrices, and locked-bottom action decks.

## Elevation & Depth

Visual hierarchy is delivered entirely through flat structural layering and high-precision outlines rather than soft ambient blur or synthetic depth. Direct outdoor sunlight washes out faint shadows; therefore, elevation is communicated through crisp borders and distinct surface steps:

- **Base Layer (Level 0):** Pure `#FFFFFF` canvas.
- **Surface Containment (Level 1):** `#F8FAFC` cards bounded by a 1px solid border in `#E2E8F0`.
- **Raised/Modal Sheets (Level 2):** `#FFFFFF` surfaces bounded by a 1.5px solid `#CBD5E1` outline, supplemented by a high-definition, tight-radius anchor shadow (`0px 4px 6px -1px rgba(15, 23, 42, 0.08)`).
- **Active Safety Anchors:** Fixed interactive trays and bottom certification bars utilize a solid top separation rule in `#E2E8F0` with no decorative blur.

## Shapes

The shape system employs disciplined, soft industrial radiuses (`roundedness: 1`). Standard interactive targets, text inputs, and table containers feature a baseline radius of 4px (`0.25rem`), expanding to 8px (`0.5rem` / `rounded-lg`) for primary cards and modular inspection panels. 

This restrained curvature reflects machined metal panels and industrial stamps, avoiding toy-like pill shapes while mitigating sharp zero-radius corners that cause visual friction in high-density data matrices.

## Components

### Buttons
- **Primary / Approval:** Filled `#15803D` with pure white bold text, zero shadow, 8px border-radius, minimum 48px height. State changes utilize `#166534` for active press.
- **Critical Action (Rejection/Halt):** Filled `#DC2626` with pure white bold text.
- **Secondary Neutral:** `#FFFFFF` background, 1.5px solid `#0F172A` border, `#0F172A` text.
- **Field Utility:** `#F1F5F9` background, `#0F172A` text, 1px border in `#CBD5E1`.

### HSRP License & Tank Chassis Plate
- Inspired by official High Security Registration Plates: A bordered oblong module featuring a 1.5px solid `#0F172A` perimeter, `#FFFFFF` interior, and an integrated left-hand blue vertical badge (`#1E40AF`) displaying white technical insignia.
- Vehicle registration text rendered using `code-plate` in stamped, high-contrast `#0F172A`.

### Status Indicators & Chips
- Crisp 1px bordered badges. Passed states: `#F0FDF4` surface, `#15803D` text, 1px border `#BBF7D0`. Failed states: `#FEF2F2` surface, `#DC2626` text, 1px border `#FECACA`. Warning states: `#FFFBEB` surface, `#D97706` text, 1px border `#FDE68A`.
- Never rely on color alone: each chip must contain a clear prefix icon (Checkmark, Cross, Octagon).

### Form Inputs & Checklists
- **Inputs:** 48px height, `#FFFFFF` background, 1px solid `#CBD5E1` border, 8px radius. Active focus: 2px solid `#0F172A` outline.
- **Inspection Toggle Checks:** Explicit dual-state binary blocks ("PASS" vs "FAIL") spanning full width, replacing standard small checkboxes to eliminate mis-taps. Selected "PASS" switches the tile to solid `#15803D` with white text; selected "FAIL" turns solid `#DC2626`.

### Cards & Telemetry Groupings
- Base structure: `#FFFFFF` card with `#E2E8F0` border and 8px border-radius.
- Top section contains a dedicated `#F8FAFC` header rail holding the sub-system title, timestamp, and serial index, cleanly demarcated from the card body by a 1px horizontal `#E2E8F0` divider line.