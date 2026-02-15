# GitHub Copilot Instructions — TextDoom

ASCII DOOM clone in TypeScript. Canvas 2D rendering, no frameworks.

## Code Style

- TypeScript strict mode
- Explicit return types on exported functions
- Interfaces over type aliases for objects
- No classes except where state encapsulation needed (InputHandler, Renderer)
- Functional style for pure logic (weapon stats, player factory, raycasting)

## Project Structure

```
src/
├── main.ts        # Game loop, 60fps requestAnimationFrame
├── renderer.ts    # All drawing (walls, sprites, HUD, weapons)
├── map.ts         # 2D array level, collision detection
├── player.ts      # createPlayer() factory
├── sprites.ts     # SpriteManager class, AI state machine
├── weapon.ts      # Weapon stats, updateWeapon(), hit detection
├── input.ts       # InputHandler class, keyboard/mouse
├── gore.ts        # GoreManager, particle physics
├── types.ts       # All interfaces and type unions
```

## Key Types

```typescript
interface Player { pos: Vec2; dir: Vec2; plane: Vec2; health: number; ammo: {...}; ... }
interface Sprite { id: number; pos: Vec2; type: SpriteType; health: number; state: SpriteState; ... }
type WeaponType = 'fist' | 'knife' | 'hammer' | 'axe' | 'pistol' | 'shotgun' | 'chaingun' | 'rocket' | 'plasma' | 'bfg' | 'flamethrower';
type SpriteType = 'imp' | 'demon' | 'cacodemon' | 'baron' | 'cyberdemon' | 'health' | 'armor' | ...;
```

## Rendering

Canvas 2D with monospace font. Each "pixel" is a character cell.
- Walls: Shaded ASCII based on distance (█▓▒░)
- Sprites: Multi-line ASCII art scaled by distance
- HUD: Health/armor bars, ammo counters, weapon display

## Performance

Target 60fps. Avoid allocations in hot paths. Raycasting is O(width × max_distance).

## Testing

No test framework. Verify with `npm run build` before committing.
