# Recall | Memory Games

Static browser games: `index.html`, Alpine.js v3, Tailwind CSS v4 (CLI build from
`assets/css/develop.css` to `assets/css/production.css`). See `README.md` for the games and
project structure.

## Build | rebuild `production.css` after CSS changes

`production.css` is the compiled file the browser loads, and it is committed. After editing
`develop.css`, or adding Tailwind classes in `index.html` or the JS files, run `npm run build`
and commit the rebuilt `production.css` together with the change. There is no dev server or
bundler; `npm run dev` only watches and recompiles the CSS.

## Design tokens | the `@theme` block is the source of truth

The `@theme` block in `assets/css/develop.css` holds the live tokens (font, colours, gradients,
radii, tracking). **When `develop.css` and the token tables in `README.md` disagree,
`develop.css` wins**, because it is what renders. Don't add new copies of token values to other
files where they can drift out of sync. Read `develop.css` instead.

## No reused bracket values, no raw px

Tailwind's arbitrary-value bracket syntax (`text-[13px]`, `w-[15px]`) is fine for a genuinely
one-off measurement. The moment the **same value is needed a second time**, resolve it in this
order instead of repeating the bracket:

1. **Check Tailwind's own scale first.** An exact match wins outright (`text-[12px]` → `text-xs`).
   A near match (1-2px off at these sizes) snaps to it rather than getting its own token.
2. **Width/height/padding/margin/gap: check the dynamic spacing utilities before adding a token.**
   Tailwind v4 generates `w-*`, `h-*`, `max-w-*`, `p-*`, `m-*`, `gap-*` etc. as
   `calc(var(--spacing) * N)` for *any* `N`, so a value that is a multiple of the 4px base unit
   already has a native utility (`w-[380px]` → `w-95`, `h-[72px]` → `h-18`).
3. **Only if nothing in Tailwind's scale fits, add a token** to the `@theme` block in
   `develop.css` and use it everywhere:
   - A step *between* two existing sizes gets a dotted key (`--radius-2\.5xl` is the existing
     example; the escaped dot produces a usable `rounded-2.5xl`).
   - A step *below/above* a whole scale gets a plain new key (`--text-xxs`).
   - A genuinely new scale with no Tailwind equivalent gets a prefixed key, so it cannot collide
     with a name Tailwind ships now or later (`--tracking-recall-loose`, not `--tracking-wide`,
     which would silently overwrite Tailwind's own default).

**No raw px** for font-size, width, height, padding, margin, gap or letter-spacing. Use rem/em
only (a Tailwind utility already is one; a new token must be too). **Carve-out:** border, ring,
outline and divide widths and shadow/blur/filter geometry stay fine as raw px, matching
Tailwind v4's own default theme.

## Brand originals | master archive, never referenced by code

The brand and design originals live **outside this repo**, in the parent folder (made readable
via `additionalDirectories` in `.claude/settings.local.json`):

- `../brand/` and `../design_handoff_recall_brand/` | logo mark, wordmark, lockups, favicons,
  and the brand guide (`design_handoff_recall_brand/README.md`).
- `../design_handoff_memorygames/` | the design handoff for the games.

These folders are the master archive. Originals always stay there. To use an asset in the game,
**derive** it: place an optimised or scaled copy where it is served (`assets/images/brand/` etc.)
or inline it. Code never references the parent folders (no paths, `@import` or build step
pointing outside the repo).

## Design references are a sketchpad | port, don't byte-mirror

Design handoffs and prototypes (such as `design_handoff_memorygames/MemoryGames.html`, built in
React with inline CSS) are a **reference**, not code to copy. **Port** a design into this
codebase's own stack and conventions (Alpine.js, Tailwind utilities, the `@theme` tokens). Never
copy a prototype's files or markup into the repo as-is.

## Icons | no emoji, no Unicode-as-icon

Icons are image or SVG assets (see `assets/images/game_icons/`). Never use emoji or Unicode
characters as icons in the UI.
