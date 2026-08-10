# Velocity Logistics - Design System

## Brand & Style
This design system is built for a high-efficiency delivery marketplace where trust and speed are paramount. The brand personality is **Reliable, Precise, and Modern**, moving away from consumer-focused softness toward a professional, utility-driven aesthetic. 

The chosen style is **Modern Corporate**, blending high-contrast elements with a rigorous grid system. It prioritizes clarity and functional density to support power users (couriers) and businesses (senders).

## Colors
The palette is anchored by a high-performance **Primary Blue (#276EF1)**, chosen for its strong association with technology and institutional trust. 

- **Primary:** `#276EF1` - Main calls to action, active states, tracking indicators.
- **Secondary:** `#000000` - Headers and high-emphasis interface elements.
- **Success Green:** `#05A357` - Exclusively for "Delivered" statuses and completed payment confirmations.
- **Neutrals:** Cool grays (#F3F3F3 and variants) define the "Surface-Container" tiers.

## Typography
The design system utilizes **Inter** across all levels.
- **Headlines:** Tighter letter spacing, heavier weights.
- **Body:** Generous line heights for legibility.
- **Labels:** Used for metadata, status tags, form headers.

## Layout & Spacing
- **Desktop:** Fixed 1280px max-width container, 12-column grid. 32px outer margins.
- **Mobile (PWA):** 4-column fluid grid, 16px horizontal margins.
- **Base Rhythm:** 8px base unit.

## Elevation & Depth
- **Level 0 (Base):** #F3F3F3 (Light Gray) background.
- **Level 1 (Cards/Surface):** #FFFFFF (White) with 1px solid #E2E2E2 border.
- **Level 2 (Active/Interactive):** Subtle ambient shadow (Y: 4px, Blur: 12px, Color: rgba(0,0,0,0.05)) for hover states.
- **Level 3 (Overlays):** Modals use 20% black backdrop blur.

## Components
### Buttons
- **Primary:** Solid #276EF1 with white text.
- **Secondary:** Solid #000000.
- **Ghost:** Transparent background with 1px #E2E2E2 border.

### Input Fields
- Standardized 48px height.
- 1px #E2E2E2 border, shifts to 2px #276EF1 on focus.

### Cards
- White background, 1px border.
- Padding: 24px desktop, 16px mobile.
- Horizontal dividers: #F3F3F3.

*(Tokens have been applied to `src/app/globals.css`)*

---

## Star Rating Component Pattern
Used on both the rating form and the driver profile page.

### Rating Selector (poster form)
- **Stars**: Material Symbols `star` with `fontVariationSettings: "'FILL' 1"`.
- **Active color**: `warning-amber` (#F5A623).
- **Inactive color**: `secondary-fixed-dim`.
- **Touch target**: each star is `h-12 w-12` flex-center; visual glyph is `text-4xl`.
- **Layout**: `flex-row-reverse` container, `gap-2`, hover/focus fills stars left-to-right via `activeRating = hoveredRating ?? selectedRating ?? 0`.

### Display Stars (driver profile page)
- **Half-star**: `star_half` symbol rendered when `score % 1 >= 0.5`.
- **Empty stars**: outline `star` with no `FILL` style override.
- **Color**: `warning-amber` (all filled/half).
- **Size**: controlled by `size` prop; default `"text-[18px]"`.

---

## Driver Profile Page — Bento Grid
- **Desktop**: 12-column grid; hero card `md:col-span-4`, reviews column `md:col-span-8`.
- **Mobile**: single column, stacked top-to-bottom.
- **Hero card**: `relative` with absolute top banner, centered avatar circle (24×24), `border-4 border-surface-white`, verified badge (`success-green` pill).
- **Rating banner**: `bg-primary-fixed text-on-primary-fixed`, star icon in white circle, bold `text-3xl`/`text-4xl` score, `/ 5.0` suffix.
- **Review cards**: each reviewer gets a colored avatar (`tertiary-fixed` alternating with `secondary-fixed`), score stars, date via `formatAppliedDate`, optional comment text.
