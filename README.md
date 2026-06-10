# MemoryGames

A Simon-style memory game. Watch the sequence of lights, repeat it in the correct order, and keep going as the sequence grows longer.

## How to play

1. Press **Start** to begin.
2. Watch the sequence of coloured buttons light up.
3. Repeat the sequence by clicking the buttons in the same order.
4. Each correct sequence earns points equal to the number of presses in that round.
5. Every 5 rounds the sequence resets and a new level begins, at increased speed.
6. A wrong press ends the game. Any correct presses made in that round are still banked.

### Keyboard shortcuts

| Key | Button |
|-----|--------|
| Q / Arrow Left | Red (top-left) |
| W / Arrow Up | Blue (top-right) |
| A / Arrow Down | Yellow (bottom-left) |
| S / Arrow Right | Cyan (bottom-right) |
| Space / Enter | Start or Retry |

## Buttons

| Position | Color | Icon |
|----------|-------|------|
| Top-left | Red | Heart |
| Top-right | Blue | Star |
| Bottom-left | Yellow | Bolt |
| Bottom-right | Cyan | Sparkles |

## Tech stack

- **HTML5**
- **Tailwind CSS v4** | utility-first styling, compiled from `develop.css`
- **Alpine.js v3** | reactive game state, audio, keyboard handling

## Project structure

```
assets/
  css/
    develop.css      Source CSS (Tailwind v4 input)
    production.css   Compiled output (served in browser)
  font/
    Barlow/          Self-hosted Barlow TTF files (400, 500, 600, 700, 900)
  js/
    alpine.js        Alpine.js v3 (local copy)
    app.js           Game logic (Alpine component)
index.html
```

## Development

Compile the CSS after editing `develop.css`:

```bash
tailwindcss -i assets/css/develop.css -o assets/css/production.css
```

Watch mode:

```bash
tailwindcss -i assets/css/develop.css -o assets/css/production.css --watch
```

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

Family: **Barlow** | Weights used: 400, 500, 600, 700, 900
