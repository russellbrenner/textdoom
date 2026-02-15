import type { GameConfig } from './types';

// ASCII gradient from darkest (nearest) to lightest (farthest)
const ASCII_RAMP = '@%#*+=-:. ';

// Wall colours based on wall type and side
const WALL_COLOURS: Record<number, { ns: string; ew: string }> = {
  1: { ns: '#00ff00', ew: '#00cc00' }, // Green
  2: { ns: '#ff0000', ew: '#cc0000' }, // Red
  3: { ns: '#0088ff', ew: '#0066cc' }, // Blue
  4: { ns: '#ffff00', ew: '#cccc00' }, // Yellow
  5: { ns: '#ff00ff', ew: '#cc00cc' }, // Magenta
  6: { ns: '#00ffff', ew: '#00cccc' }, // Cyan
};

const FLOOR_COLOUR = '#333333';
const CEILING_COLOUR = '#111111';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;

    // Set canvas size
    this.canvas.width = config.screenWidth * config.cellWidth;
    this.canvas.height = config.screenHeight * config.cellHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    // Set up font for ASCII rendering
    this.ctx.font = `${config.cellHeight}px monospace`;
    this.ctx.textBaseline = 'top';
  }

  /** Clear screen with floor/ceiling */
  clear(): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;
    const midY = Math.floor(screenHeight / 2);

    // Ceiling
    this.ctx.fillStyle = CEILING_COLOUR;
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, midY * cellHeight);

    // Floor
    this.ctx.fillStyle = FLOOR_COLOUR;
    this.ctx.fillRect(0, midY * cellHeight, screenWidth * cellWidth, (screenHeight - midY) * cellHeight);
  }

  /** Draw a vertical strip of wall */
  drawWallStrip(
    x: number,
    wallHeight: number,
    distance: number,
    side: 0 | 1,
    wallType: number
  ): void {
    const { screenHeight, cellWidth, cellHeight } = this.config;

    // Calculate draw bounds
    const drawHeight = Math.min(wallHeight, screenHeight);
    const startY = Math.floor((screenHeight - drawHeight) / 2);

    // Get ASCII character based on distance
    const maxDist = 16; // Max visible distance
    const normalised = Math.min(distance / maxDist, 1);
    const charIndex = Math.floor(normalised * (ASCII_RAMP.length - 1));
    const char = ASCII_RAMP[charIndex];

    // Get colour based on wall type and side
    const colours = WALL_COLOURS[wallType] || WALL_COLOURS[1];
    const colour = side === 0 ? colours.ns : colours.ew;

    // Draw the vertical strip
    this.ctx.fillStyle = colour;
    for (let y = 0; y < drawHeight; y++) {
      const screenY = startY + y;
      this.ctx.fillText(
        char,
        x * cellWidth,
        screenY * cellHeight
      );
    }
  }

  /** Draw FPS counter */
  drawFPS(fps: number): void {
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText(`FPS: ${Math.round(fps)}`, 5, 5);
  }

  /** Get canvas dimensions */
  getSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}
