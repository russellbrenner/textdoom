import type { Player, InputState, GameConfig, PlayerId } from './types';
import { isWall } from './map';

const COLLISION_MARGIN = 0.2; // Distance to keep from walls

// Spawn points for multiplayer
const SPAWN_POINTS: Record<PlayerId, { x: number; y: number; dirX: number; dirY: number }> = {
  1: { x: 2.5, y: 2.5, dirX: 1, dirY: 0 },      // Top-left, facing east
  2: { x: 21.5, y: 21.5, dirX: -1, dirY: 0 },   // Bottom-right, facing west
};

/**
 * Create initial player state
 * @param playerId Player number (1 or 2) for spawn position
 */
export function createPlayer(playerId: PlayerId = 1): Player {
  const spawn = SPAWN_POINTS[playerId];
  return {
    pos: { x: spawn.x, y: spawn.y },
    dir: { x: spawn.dirX, y: spawn.dirY },
    plane: { x: 0, y: spawn.dirX * 0.66 }, // FOV ~66 degrees, perpendicular to dir
    health: 100,
    armor: 0,
    ammo: {
      bullets: 100,  // Pistol/chaingun - plenty to start
      shells: 20,    // Shotgun - enough for early game
      rockets: 5,    // Rocket launcher - a few big booms
      cells: 50,     // Plasma/BFG - can try plasma
      fuel: 50,      // Flamethrower - can try it out
    },
    isDead: false,
    damageFlash: 0,
    screenShake: 0,
  };
}

/**
 * Reset player to initial state
 */
export function resetPlayer(player: Player, playerId: PlayerId = 1): void {
  const spawn = SPAWN_POINTS[playerId];
  player.pos = { x: spawn.x, y: spawn.y };
  player.dir = { x: spawn.dirX, y: spawn.dirY };
  player.plane = { x: 0, y: spawn.dirX * 0.66 };
  player.health = 100;
  player.armor = 0;
  player.ammo = {
    bullets: 100,
    shells: 20,
    rockets: 5,
    cells: 50,
    fuel: 50,
  };
  player.isDead = false;
  player.damageFlash = 0;
  player.screenShake = 0;
}

/**
 * Update player based on input
 * Handles movement and rotation with collision detection
 */
export function updatePlayer(
  player: Player,
  input: InputState,
  deltaTime: number,
  config: GameConfig
): void {
  // Fade damage flash
  if (player.damageFlash > 0) {
    player.damageFlash = Math.max(0, player.damageFlash - deltaTime * 3);
  }

  // Fade screen shake
  if (player.screenShake > 0) {
    player.screenShake = Math.max(0, player.screenShake - deltaTime * 8);
  }

  // Dead players can't move
  if (player.isDead) {
    return;
  }

  const moveSpeed = config.moveSpeed * deltaTime;
  const rotSpeed = config.rotSpeed * deltaTime;

  // Forward/backward movement
  if (input.forward) {
    moveWithCollision(player, player.dir.x * moveSpeed, player.dir.y * moveSpeed);
  }
  if (input.backward) {
    moveWithCollision(player, -player.dir.x * moveSpeed, -player.dir.y * moveSpeed);
  }

  // Strafing
  if (input.strafeLeft) {
    moveWithCollision(player, -player.dir.y * moveSpeed, player.dir.x * moveSpeed);
  }
  if (input.strafeRight) {
    moveWithCollision(player, player.dir.y * moveSpeed, -player.dir.x * moveSpeed);
  }

  // Rotation (left/right arrows or A/D keys)
  if (input.left) {
    rotate(player, rotSpeed);
  }
  if (input.right) {
    rotate(player, -rotSpeed);
  }
}

/**
 * Move player with collision detection
 * Allows sliding along walls
 */
function moveWithCollision(player: Player, dx: number, dy: number): void {
  const newX = player.pos.x + dx;
  const newY = player.pos.y + dy;

  // Try moving in X
  if (!isWall(newX + Math.sign(dx) * COLLISION_MARGIN, player.pos.y)) {
    player.pos.x = newX;
  }

  // Try moving in Y
  if (!isWall(player.pos.x, newY + Math.sign(dy) * COLLISION_MARGIN)) {
    player.pos.y = newY;
  }
}

/**
 * Rotate player direction and camera plane
 */
function rotate(player: Player, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Rotate direction vector
  const oldDirX = player.dir.x;
  player.dir.x = player.dir.x * cos - player.dir.y * sin;
  player.dir.y = oldDirX * sin + player.dir.y * cos;

  // Rotate camera plane
  const oldPlaneX = player.plane.x;
  player.plane.x = player.plane.x * cos - player.plane.y * sin;
  player.plane.y = oldPlaneX * sin + player.plane.y * cos;
}
