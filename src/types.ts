/** 2D vector for positions and directions */
export interface Vec2 {
  x: number;
  y: number;
}

/** Player state */
export interface Player {
  pos: Vec2;      // World position
  dir: Vec2;      // Direction vector (normalised)
  plane: Vec2;    // Camera plane (perpendicular to dir, defines FOV)
  health: number; // 0-100
  armor: number;  // 0-100
  ammo: {
    bullets: number;   // Pistol/chaingun
    shells: number;    // Shotgun
    rockets: number;   // Rocket launcher
    cells: number;     // Plasma/BFG
    fuel: number;      // Flamethrower
  };
  isDead: boolean;
  damageFlash: number; // 0-1, for red flash effect
  screenShake: number; // Screen shake intensity
  damageDirection?: Vec2; // Direction damage came from (world space)
}

/** Sprite types */
export type SpriteType = 'imp' | 'demon' | 'cacodemon' | 'baron' | 'cyberdemon' | 'health' | 'armor' | 'ammo_bullets' | 'ammo_shells' | 'ammo_rockets' | 'ammo_cells' | 'ammo_fuel' | 'corpse' | 'gib';

/** Sprite AI states */
export type SpriteState = 'idle' | 'chase' | 'attack' | 'pain' | 'dead';

/** Sprite entity */
export interface Sprite {
  id: number;
  pos: Vec2;
  type: SpriteType;
  health: number;
  state: SpriteState;
  animFrame: number;
  lastSeen: number;      // Timestamp when player was last seen
  lastSeenPos: Vec2;     // Where player was last seen
  attackCooldown: number;
  dir: Vec2;             // Direction sprite is facing
  velocity: Vec2;        // Current movement
}

/** Sprite spawn definition */
export interface SpriteSpawn {
  x: number;
  y: number;
  type: SpriteType;
}

/** Weapon types */
export type WeaponType = 'fist' | 'pistol' | 'shotgun' | 'chaingun' | 'rocket' | 'plasma' | 'bfg' | 'flamethrower';

/** Weapon state */
export interface WeaponState {
  type: WeaponType;
  cooldown: number;
  animFrame: number;
  isFiring: boolean;
  spinup: number;  // For chaingun wind-up
}

/** Gore particle */
export interface GoreParticle {
  pos: Vec2;
  vel: Vec2;
  char: string;
  colour: string;
  life: number;
  maxLife: number;
  type: 'blood' | 'gib' | 'spark' | 'plasma' | 'flame';
}

/** Blood decal on floor/wall */
export interface BloodDecal {
  x: number;
  y: number;
  size: number;
  age: number;
}

/** Result from casting a single ray */
export interface RayHit {
  distance: number;     // Perpendicular distance to wall
  side: 0 | 1;          // 0 = vertical (N/S), 1 = horizontal (E/W)
  wallX: number;        // Where on wall ray hit (0-1, for texturing)
  mapX: number;         // Grid cell X
  mapY: number;         // Grid cell Y
}

/** Dynamic light source */
export interface LightSource {
  pos: Vec2;
  colour: string;         // Hex colour
  intensity: number;      // 0-1
  radius: number;         // Range in world units
  flicker: boolean;       // Whether to flicker
  flickerPhase?: number;  // Random phase for desync
}

/** Game configuration */
export interface GameConfig {
  screenWidth: number;    // Width in character cells
  screenHeight: number;   // Height in character cells
  cellWidth: number;      // Pixel width per character
  cellHeight: number;     // Pixel height per character
  moveSpeed: number;      // Units per second
  rotSpeed: number;       // Radians per second
}

/** Keyboard state */
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  fire: boolean;
}

/** Player ID for multiplayer */
export type PlayerId = 1 | 2;
