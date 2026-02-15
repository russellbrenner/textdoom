import type { Player, RayHit, GameConfig } from './types';
import { MAP, MAP_WIDTH, MAP_HEIGHT } from './map';

/**
 * DDA Raycaster implementation
 * Uses Digital Differential Analyser algorithm to step through grid cells
 */
export class Raycaster {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * Cast all rays for the current frame
   * Returns array of RayHit results, one per screen column
   */
  castRays(player: Player): RayHit[] {
    const hits: RayHit[] = [];

    for (let x = 0; x < this.config.screenWidth; x++) {
      // Calculate ray direction
      // cameraX ranges from -1 (left edge) to +1 (right edge)
      const cameraX = (2 * x) / this.config.screenWidth - 1;
      const rayDirX = player.dir.x + player.plane.x * cameraX;
      const rayDirY = player.dir.y + player.plane.y * cameraX;

      hits.push(this.castSingleRay(player.pos.x, player.pos.y, rayDirX, rayDirY));
    }

    return hits;
  }

  /**
   * Cast a single ray using DDA algorithm
   */
  private castSingleRay(
    posX: number,
    posY: number,
    rayDirX: number,
    rayDirY: number
  ): RayHit {
    // Current map cell
    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    // Length of ray from one side to next
    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    // Direction to step in (+1 or -1)
    let stepX: number;
    let stepY: number;

    // Distance to next grid line
    let sideDistX: number;
    let sideDistY: number;

    // Calculate step and initial sideDist
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - posX) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - posY) * deltaDistY;
    }

    // DDA loop - step through grid until wall hit
    let side: 0 | 1 = 0; // 0 = vertical (N/S wall), 1 = horizontal (E/W wall)
    let hit = false;

    while (!hit) {
      // Jump to next grid cell
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      // Check bounds
      if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
        hit = true;
      } else if (MAP[mapY][mapX] > 0) {
        hit = true;
      }
    }

    // Calculate perpendicular distance (avoids fisheye)
    let perpWallDist: number;
    if (side === 0) {
      perpWallDist = sideDistX - deltaDistX;
    } else {
      perpWallDist = sideDistY - deltaDistY;
    }

    // Prevent division by zero
    if (perpWallDist < 0.01) perpWallDist = 0.01;

    // Calculate where exactly the wall was hit (for texturing)
    let wallX: number;
    if (side === 0) {
      wallX = posY + perpWallDist * rayDirY;
    } else {
      wallX = posX + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    return {
      distance: perpWallDist,
      side,
      wallX,
      mapX,
      mapY,
    };
  }

  /**
   * Calculate wall height on screen from perpendicular distance
   */
  calculateWallHeight(distance: number): number {
    return Math.floor(this.config.screenHeight / distance);
  }
}
