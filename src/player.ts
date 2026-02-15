import type { Player, InputState, GameConfig } from './types';
import { isWall } from './map';

const COLLISION_MARGIN = 0.2; // Distance to keep from walls

/**
 * Create initial player state
 * Starts in the middle of the map facing east
 */
export function createPlayer(): Player {
  return {
    pos: { x: 2.5, y: 2.5 },
    dir: { x: 1, y: 0 },      // Facing east
    plane: { x: 0, y: 0.66 }, // FOV ~66 degrees
  };
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
