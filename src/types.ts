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
}

/** Result from casting a single ray */
export interface RayHit {
  distance: number;     // Perpendicular distance to wall
  side: 0 | 1;          // 0 = vertical (N/S), 1 = horizontal (E/W)
  wallX: number;        // Where on wall ray hit (0-1, for texturing)
  mapX: number;         // Grid cell X
  mapY: number;         // Grid cell Y
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
}
