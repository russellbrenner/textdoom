# Claude Code Instructions — TextDoom

ASCII DOOM clone built with TypeScript/Vite, deployed to GitHub Pages.

## Quick Start

```bash
npm install      # Install dependencies
npm run dev      # Dev server at localhost:5173
npm run build    # Production build to dist/
```

## Architecture

| File | Purpose |
|------|---------|
| `src/main.ts` | Game loop, state machine (menu/single/multi/online/tutorial/username/paused) |
| `src/renderer.ts` | Canvas 2D ASCII rendering, HUD, weapon sprites, combat feedback |
| `src/map.ts` | Level layout, wall collision, DDA raycasting |
| `src/player.ts` | Player state factory, movement physics |
| `src/sprites.ts` | Enemy AI (chase/attack/pain/dead states), pickups, health bars |
| `src/weapon.ts` | 11 weapons with damage/cooldown/ammo stats, hit detection |
| `src/input.ts` | Keyboard/mouse handling, single/multiplayer key mappings |
| `src/gore.ts` | Blood particles, gibs, flame effects |
| `src/stats.ts` | localStorage leaderboard, username persistence |
| `src/network.ts` | PeerJS WebRTC for online multiplayer |
| `src/types.ts` | TypeScript interfaces (Player, Sprite, Weapon, etc.) |

## Key Patterns

### Weapon System
Weapons defined in `WEAPON_STATS` record with: damage, cooldown, ammoType, ammoPerShot, optional pellets/splash/screenShake/muzzleFlash.

```typescript
const WEAPON_ORDER: WeaponType[] = ['fist', 'knife', 'hammer', 'axe', 'pistol', 'shotgun', 'chaingun', 'rocket', 'plasma', 'bfg', 'flamethrower'];
```

### Combat Feedback
- `renderer.showHitMarker()` — Red X on hit
- `renderer.showKillMessage(type)` — "KILLED IMP" in enemy colour
- `player.damageDirection` — Vec2 for damage indicator arrows

### Input Handling
- Single player: WASD + arrows both work
- Multiplayer: WASD for P1, arrows for P2
- Detection via `this.player2 === null`

### Rendering
Canvas 2D preferred over WebGL for readability. Post-processing kept minimal (subtle vignette only).

## Common Tasks

### Add a new weapon
1. Add type to `WeaponType` union in `types.ts`
2. Add stats to `WEAPON_STATS` in `weapon.ts`
3. Add to `WEAPON_ORDER` array
4. Add ASCII art in `renderer.ts` `drawWeapon()` switch

### Add a new enemy
1. Add type to `SpriteType` union in `types.ts`
2. Add stats in `sprites.ts` (health, damage, speed)
3. Add ASCII art in `renderer.ts` `getSpriteChar()`
4. Add spawn to map

### Add combat feedback
- Hit effects: `renderer.showHitMarker()` called from `weapon.ts`
- Screen shake: Set `player.screenShake` value
- Muzzle flash: `renderer.setMuzzleFlash(intensity)`

## Testing

No test framework currently. Manual testing via `npm run dev`.

Build must pass before committing:
```bash
npm run build
```

## Deployment

Automatic via GitHub Actions on push to main. See `.github/workflows/deploy.yml`.

Live at: https://russellbrenner.github.io/textdoom/
