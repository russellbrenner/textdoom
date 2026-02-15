# TextDoom

ASCII DOOM clone running in the browser. Built with TypeScript and rendered entirely in text characters.

**[Play it now](https://russellbrenner.github.io/textdoom/)**

## Features

- **Raycasting engine** — DDA algorithm renders 3D perspective in ASCII
- **11 weapons** — Fist, knife, hammer, axe, pistol, shotgun, chaingun, rocket launcher, plasma rifle, BFG, flamethrower
- **5 enemy types** — Imp, demon, cacodemon, baron, cyberdemon
- **Gore system** — Blood particles, gibs, decals
- **Combat feedback** — Hit markers, kill messages, damage direction indicators, enemy health bars
- **Local multiplayer** — Split-screen for two players
- **Online multiplayer** — PeerJS WebRTC connections
- **Leaderboard** — Persistent stats with player usernames

## Controls

### Single Player
| Action | Keys |
|--------|------|
| Move | WASD or Arrow keys |
| Turn | A/D or Left/Right |
| Strafe | Q/E |
| Fire | Space or Mouse |
| Weapons | 1-9, 0, - (or numpad) |
| Pause | P or Escape |

### Split-Screen Multiplayer
| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move | WASD | Arrow keys |
| Strafe | Q/E | , / . |
| Fire | Space/Mouse | Enter |
| Weapons | 1-9, 0, - | F1-F11 |

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Running on Kindle

Want to play TextDoom on your Kindle? See **[KINDLE.md](KINDLE.md)** for detailed instructions on:
- Using the live hosted version (easiest)
- Compiling and deploying locally
- Kindle-specific considerations and troubleshooting

## Tech Stack

- TypeScript
- Vite
- Canvas 2D rendering
- PeerJS (online multiplayer)
- GitHub Pages (hosting)

## Architecture

```
src/
├── main.ts        # Game loop, state machine
├── renderer.ts    # ASCII rendering, HUD, effects
├── map.ts         # Level data, collision
├── player.ts      # Player state, movement
├── sprites.ts     # Enemy AI, pickups
├── weapon.ts      # Weapon stats, firing logic
├── input.ts       # Keyboard/mouse handling
├── gore.ts        # Particle effects
├── stats.ts       # Leaderboard, persistence
├── network.ts     # PeerJS multiplayer
└── types.ts       # TypeScript interfaces
```

## Contributing

This project uses Claude Code and GitHub Copilot for development. See:
- `CLAUDE.md` — Instructions for Claude Code
- `.github/copilot-instructions.md` — Instructions for GitHub Copilot

Use `@claude` mentions in issues and PRs to request AI assistance.

## Licence

MIT
