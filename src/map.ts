import type { SpriteSpawn, LightSource } from './types';

/**
 * Map data - 0 is empty, 1+ are wall types
 * Player starts at the first empty space found
 *
 * Wall types:
 * 1 = Stone blocks
 * 2 = Red brick
 * 3 = Blue tech panel
 * 4 = Yellow warning stripes
 * 5 = Purple flesh
 * 6 = Cyan circuit
 * 7 = Lava (animated)
 * 8 = Green slime (animated)
 * 9 = Metal grate
 * 10 = Blood wall
 * 11 = Pulsing flesh
 * 12 = Tech conduit
 */

export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 24;

// Hand-crafted level with interesting geometry
export const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,2,2,2,2,2,0,0,0,0,0,3,3,3,3,3,0,0,0,0,1],
  [1,0,0,0,2,0,0,0,2,0,0,0,0,0,3,0,0,0,3,0,0,0,0,1],
  [1,0,0,0,2,0,0,0,2,0,0,0,0,0,3,0,0,0,3,0,0,0,0,1],
  [1,0,0,0,2,0,0,0,2,0,0,0,0,0,3,0,0,0,3,0,0,0,0,1],
  [1,0,0,0,2,2,0,2,2,0,0,0,0,0,3,3,0,3,3,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,5,5,5,5,5,5,0,0,0,0,6,6,6,6,6,6,0,0,0,1],
  [1,0,0,0,5,0,0,0,0,5,0,0,0,0,6,0,0,0,0,6,0,0,0,1],
  [1,0,0,0,5,0,0,0,0,5,0,0,0,0,6,0,0,0,0,6,0,0,0,1],
  [1,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,1],
  [1,0,0,0,5,5,5,5,5,5,0,0,0,0,6,6,6,6,6,6,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

/** Check if a position is a wall */
export function isWall(x: number, y: number): boolean {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
    return true;
  }
  return MAP[mapY][mapX] !== 0;
}

/** Get wall type at position (0 if empty) */
export function getWallType(x: number, y: number): number {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
    return 1;
  }
  return MAP[mapY][mapX];
}

/** Sprite spawn points */
export const SPRITE_SPAWNS: SpriteSpawn[] = [
  // === ENEMIES ===

  // Imps in the red room (fast, low HP)
  { x: 6, y: 6, type: 'imp' },
  { x: 7, y: 7, type: 'imp' },

  // Imps in the blue room
  { x: 16, y: 6, type: 'imp' },
  { x: 17, y: 7, type: 'imp' },

  // Demons in the yellow room (slow, high HP)
  { x: 11, y: 12, type: 'demon' },
  { x: 12, y: 13, type: 'demon' },

  // Imps in the purple room
  { x: 6, y: 19, type: 'imp' },
  { x: 7, y: 19, type: 'imp' },

  // Demon in the cyan room
  { x: 17, y: 19, type: 'demon' },

  // Cacodemon floating in the central corridor
  { x: 11, y: 9, type: 'cacodemon' },

  // Baron of Hell guarding the southern area
  { x: 11, y: 16, type: 'baron' },

  // === HEALTH PICKUPS ===
  { x: 10, y: 2, type: 'health' },
  { x: 12, y: 10, type: 'health' },
  { x: 2, y: 22, type: 'health' },
  { x: 21, y: 2, type: 'health' },

  // === ARMOR ===
  { x: 2, y: 2, type: 'armor' },
  { x: 21, y: 22, type: 'armor' },

  // === AMMO PICKUPS ===

  // Bullets (pistol/chaingun)
  { x: 11, y: 2, type: 'ammo_bullets' },
  { x: 2, y: 10, type: 'ammo_bullets' },
  { x: 21, y: 10, type: 'ammo_bullets' },

  // Shells (shotgun)
  { x: 6, y: 5, type: 'ammo_shells' },
  { x: 17, y: 5, type: 'ammo_shells' },
  { x: 11, y: 14, type: 'ammo_shells' },

  // Rockets (rocket launcher)
  { x: 6, y: 18, type: 'ammo_rockets' },
  { x: 17, y: 18, type: 'ammo_rockets' },

  // Cells (plasma/BFG)
  { x: 12, y: 22, type: 'ammo_cells' },
  { x: 2, y: 15, type: 'ammo_cells' },

  // Fuel (flamethrower)
  { x: 21, y: 15, type: 'ammo_fuel' },
  { x: 11, y: 5, type: 'ammo_fuel' },
];

/** Static torch light positions */
export const TORCH_LIGHTS: LightSource[] = [
  // Red room torches
  { pos: { x: 4.5, y: 4.5 }, colour: '#ff6600', intensity: 0.8, radius: 4, flicker: true, flickerPhase: 0 },
  { pos: { x: 8.5, y: 4.5 }, colour: '#ff6600', intensity: 0.8, radius: 4, flicker: true, flickerPhase: 1.5 },

  // Blue room torches
  { pos: { x: 14.5, y: 4.5 }, colour: '#0088ff', intensity: 0.7, radius: 4, flicker: true, flickerPhase: 0.7 },
  { pos: { x: 18.5, y: 4.5 }, colour: '#0088ff', intensity: 0.7, radius: 4, flicker: true, flickerPhase: 2.2 },

  // Yellow room - brighter
  { pos: { x: 11.5, y: 11.5 }, colour: '#ffcc00', intensity: 0.9, radius: 5, flicker: true, flickerPhase: 1.1 },

  // Purple room - eerie
  { pos: { x: 4.5, y: 17.5 }, colour: '#cc00cc', intensity: 0.6, radius: 4, flicker: true, flickerPhase: 0.3 },
  { pos: { x: 9.5, y: 17.5 }, colour: '#cc00cc', intensity: 0.6, radius: 4, flicker: true, flickerPhase: 1.8 },

  // Cyan room - tech glow
  { pos: { x: 14.5, y: 17.5 }, colour: '#00ffff', intensity: 0.7, radius: 4, flicker: false },
  { pos: { x: 19.5, y: 17.5 }, colour: '#00ffff', intensity: 0.7, radius: 4, flicker: false },

  // Corridor lights
  { pos: { x: 11.5, y: 5 }, colour: '#ffffff', intensity: 0.5, radius: 3, flicker: true, flickerPhase: 0.5 },
  { pos: { x: 11.5, y: 15 }, colour: '#ff4400', intensity: 0.6, radius: 4, flicker: true, flickerPhase: 2.0 },
];
