# Recall — Memory Games

A collection of four browser-based memory games, plus a dashboard and a scores page for tracking personal bests across all of them.

## Games

### Sequence

A Simon-style game. Watch the sequence of lights, repeat it in the correct order, and keep going as the sequence grows longer.

1. Press **Start** to begin.
2. Watch the sequence of coloured buttons light up.
3. Repeat the sequence by clicking the buttons in the same order.
4. Each correct sequence earns points equal to the number of presses in that round.
5. Every 5 rounds the sequence resets and a new level begins, at increased speed.
6. A wrong press ends the game. Any correct presses made in that round are still banked.

**Keyboard shortcuts**

| Key | Button |
|-----|--------|
| Q / Arrow Left | Red (top-left) |
| W / Arrow Up | Blue (top-right) |
| A / Arrow Down | Yellow (bottom-left) |
| S / Arrow Right | Cyan (bottom-right) |
| Space / Enter | Start or Retry |

**Buttons**

| Position | Color | Icon |
|----------|-------|------|
| Top-left | Red | Heart |
| Top-right | Blue | Star |
| Bottom-left | Yellow | Bolt |
| Bottom-right | Cyan | Sparkles |

### Match

A pairs/concentration game with three modes:

- **Against Timer** — find every pair before the 60-second clock runs out. Clear a set and a new one appears; keep going to build your score.
- **Fastest Time** — timing starts on your first flip and stops on your last pair. Keep clearing sets to beat your best time.
- **Perfect Streak** — memorize the cards during the preview, then find every pair from memory. One wrong pair ends the run. 4 levels, 5 stages each — clear level 4 stage 5 to win.

### Difference (Spot the Difference)

Two near-identical panels are shown side by side; click every spot where they differ. Three modes:

- **Levels** — clear 5 stages per level to advance. Differences per stage grow from 4 up to 22 across 10 levels.
- **Against Timer** — find every difference before the 60-second clock runs out. Keep clearing rounds to build your score.
- **Fastest Time** — starts on a "Ready?" screen; press Play to reveal the panels and start the clock. Timing stops on your last find. Sessions are capped at 5 minutes, with a warning (and the option to keep going) before they end.

Scenes and differences are procedurally assembled from a pool of ~20 hand-built illustrations (`assets/js/spot-diff.js`), so rounds vary each time you play.

### Tray

A memorize-and-recall game. Objects appear on a tray, get covered, then you pick out which ones you saw.

- **Classic** — memorize the tray for 60 seconds (or press **Got it** to skip ahead once you're confident), then pick the objects you saw from a grid of silhouettes. 2 points per correct pick, -1 for a wrong one, 3 minutes to answer.
- **Fastest Time** — memorize, then select everything you remember and submit. Selected tiles show in full color. Only a fully correct answer stops the clock — up to 3 attempts.
- **Perfect Streak** — memorize a growing tray each stage. One wrong pick ends the run. 10 levels, 5 stages each, 6 up to 24 objects — clear level 10 stage 5 to win.

## Dashboard & Scores

- The **Dashboard** shows each game's personal best at a glance.
- The **Scores** page lists your most recent results per game and mode, and lets you delete scores — per game, or all at once.

## Tech stack

- **HTML5**
- **Tailwind CSS v4** | utility-first styling, compiled from `develop.css`
- **Alpine.js v3** | reactive game state, audio, keyboard handling, persisted scores (`@alpinejs/persist`)

## Project structure

```
assets/
  css/
    develop.css       Source CSS (Tailwind v4 input)
    production.css    Compiled output (served in browser)
  font/
    Barlow/           Self-hosted Barlow TTF files (400, 500, 600, 700, 800, 900)
  images/
    brand/            Favicons and logo marks
    card_fronts/      Match game card-front art
    game_icons/       Icons used on the dashboard and nav
    tray_objects/     Tray game object art (color/ and silhouette/ variants, plus the cover)
  js/
    alpine.js         Alpine.js v3 (local copy)
    app.js            Game logic for all four games, dashboard, scores page, and the shared score store
    spot-diff.js       Scene and diff-generation engine for the Difference game
index.html
package.json
```

## Development

Install dependencies once:

```bash
npm install
```

Rebuild `production.css` after editing `develop.css`:

```bash
npm run build
```

Watch mode while developing:

```bash
npm run dev
```

`index.html` is a static file — open it directly, or serve the repo root with any static file server.

## Design tokens

### Gradients

| Name | From | To |
|------|------|----|
| Blue | hsl(230, 89%, 62%) | hsl(230, 89%, 65%) |
| Red | hsl(349, 71%, 52%) | hsl(349, 70%, 56%) |
| Yellow | hsl(39, 89%, 49%) | hsl(40, 84%, 53%) |
| Cyan | hsl(189, 59%, 53%) | hsl(189, 58%, 57%) |
| Purple | hsl(261, 73%, 60%) | hsl(261, 72%, 63%) |
| Background | hsl(214, 47%, 23%) | hsl(237, 49%, 15%) |

### Neutral

| Role | Value |
|------|-------|
| Dark text | hsl(229, 25%, 31%) |
| Score text | hsl(229, 64%, 46%) |
| Header outline | hsl(217, 16%, 45%) |

### Font

Family: **Barlow** | Weights used: 400, 500, 600, 700, 800, 900
