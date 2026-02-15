import type { GameConfig } from './types';
import { Renderer } from './renderer';
import { Raycaster } from './raycaster';
import { InputHandler } from './input';
import { createPlayer, updatePlayer } from './player';
import { getWallType } from './map';

// Game configuration
const CONFIG: GameConfig = {
  screenWidth: 120,       // Character columns
  screenHeight: 40,       // Character rows
  cellWidth: 8,           // Pixels per character width
  cellHeight: 16,         // Pixels per character height
  moveSpeed: 3.0,         // Units per second
  rotSpeed: 2.0,          // Radians per second
};

// Game state
let lastTime = 0;
let fpsCounter = 0;
let fpsTime = 0;
let currentFps = 0;

// Initialise game components
const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const renderer = new Renderer(canvas, CONFIG);
const raycaster = new Raycaster(CONFIG);
const input = new InputHandler();
const player = createPlayer();

/**
 * Main game loop
 */
function gameLoop(timestamp: number): void {
  // Calculate delta time in seconds
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Update FPS counter
  fpsCounter++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    currentFps = fpsCounter / fpsTime;
    fpsCounter = 0;
    fpsTime = 0;
  }

  // Update player based on input
  updatePlayer(player, input.getState(), deltaTime, CONFIG);

  // Clear and render
  renderer.clear();

  // Cast rays and render walls
  const rays = raycaster.castRays(player);
  for (let x = 0; x < rays.length; x++) {
    const hit = rays[x];
    const wallHeight = raycaster.calculateWallHeight(hit.distance);
    const wallType = getWallType(hit.mapX, hit.mapY);
    renderer.drawWallStrip(x, wallHeight, hit.distance, hit.side, wallType);
  }

  // Draw FPS
  renderer.drawFPS(currentFps);

  // Continue loop
  requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame((timestamp) => {
  lastTime = timestamp;
  gameLoop(timestamp);
});
