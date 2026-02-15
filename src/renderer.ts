import type { GameConfig, Player, WeaponState, GoreParticle, BloodDecal, RayHit, LightSource, Vec2, ShopState, WeaponType } from './types';
import { sampleWallStrip, sampleFloorTexture, sampleCeilingTexture } from './textures';
import { formatTime, type Leaderboard, getUpgradeCost, MAX_UPGRADE_LEVEL, loadShopState } from './stats';
import { getWeaponStats } from './weapon';

// Weapon ASCII art frames (12x7 for better detail)
const WEAPON_ART: Record<string, { idle: string[]; fired: string[] }> = {
  fist: {
    idle: [
      '            ',
      '    ╔══╗    ',
      '   ╔╩██╩╗   ',
      '   ║████║   ',
      '   ║████║   ',
      '   ╚════╝   ',
      '            ',
    ],
    fired: [
      '            ',
      '   ╔════╗   ',
      '   ║████║   ',
      '  ╔╩████╩╗  ',
      '  ║██████║  ',
      '  ╚══════╝  ',
      '            ',
    ],
  },
  knife: {
    idle: [
      '      ▲     ',
      '     ╱█╲    ',
      '    ╱██╲    ',
      '   ╱████╲   ',
      '    ╔══╗    ',
      '    ║██║    ',
      '    ╚══╝    ',
    ],
    fired: [
      '    \\▲/     ',
      '     █      ',
      '    ╱█╲     ',
      '   ╱██╲     ',
      '    ╔══╗    ',
      '    ║██║    ',
      '    ╚══╝    ',
    ],
  },
  hammer: {
    idle: [
      ' ╔════════╗ ',
      ' ║████████║ ',
      ' ╚════╦═══╝ ',
      '      ║     ',
      '      ║     ',
      '     ╔╩╗    ',
      '     ╚═╝    ',
    ],
    fired: [
      '            ',
      ' ╔════════╗ ',
      ' ║████████║ ',
      ' ╚═══╦════╝ ',
      '     ║      ',
      '    ╔╩╗     ',
      '    ╚═╝     ',
    ],
  },
  axe: {
    idle: [
      '    ╔═══╗   ',
      '   ╔╝███╚╗  ',
      '   ║█████║  ',
      '   ╚══╦══╝  ',
      '      ║     ',
      '     ╔╩╗    ',
      '     ╚═╝    ',
    ],
    fired: [
      '   \\═══/    ',
      '   ╔═══╗    ',
      '  ╔╝███╚╗   ',
      '  ║█████║   ',
      '  ╚══╦══╝   ',
      '    ╔╩╗     ',
      '    ╚═╝     ',
    ],
  },
  pistol: {
    idle: [
      '            ',
      '      ║     ',
      '     ╔╩╗    ',
      '     ║█║    ',
      '    ╔╝ ╚╗   ',
      '    ╚═══╝   ',
      '            ',
    ],
    fired: [
      '     \\█/    ',
      '      ║     ',
      '     ╔╩╗    ',
      '     ║█║    ',
      '    ╔╝ ╚╗   ',
      '    ╚═══╝   ',
      '            ',
    ],
  },
  shotgun: {
    idle: [
      '════════════',
      '      ║██║  ',
      '     ╔╩══╩╗ ',
      '     ║████║ ',
      '    ╔╝    ╚╗',
      '    ╚══════╝',
      '            ',
    ],
    fired: [
      '\\██████████/',
      '════════════',
      '      ║██║  ',
      '     ╔╩══╩╗ ',
      '     ║████║ ',
      '    ╔╝    ╚╗',
      '    ╚══════╝',
    ],
  },
  chaingun: {
    idle: [
      '════════════',
      '  ║║║║║║║║  ',
      '    ╔════╗  ',
      '    ║████║  ',
      '    ╠════╣  ',
      '    ║████║  ',
      '    ╚════╝  ',
    ],
    fired: [
      '\\██████████/',
      '════════════',
      '  ║║║║║║║║  ',
      '    ╔════╗  ',
      '    ║████║  ',
      '    ╠════╣  ',
      '    ║████║  ',
    ],
  },
  rocket: {
    idle: [
      '══════╦════╗',
      '      ║████║',
      '   ╔══╩════╝',
      '   ║███████ ',
      '   ║███████ ',
      '   ╚═══════ ',
      '            ',
    ],
    fired: [
      '\\█████╦████/',
      '══════║════╗',
      '      ║████║',
      '   ╔══╩════╝',
      '   ║███████ ',
      '   ║███████ ',
      '   ╚═══════ ',
    ],
  },
  plasma: {
    idle: [
      '════════════',
      '    ╔════╗  ',
      '   ╔╩════╩╗ ',
      '   ║█▓▒░▒█║ ',
      '   ║██████║ ',
      '   ╚══════╝ ',
      '    ◊    ◊  ',
    ],
    fired: [
      '    ◆◆◆◆    ',
      '════════════',
      '    ╔════╗  ',
      '   ╔╩════╩╗ ',
      '   ║█▓▒░▒█║ ',
      '   ║██████║ ',
      '   ╚══════╝ ',
    ],
  },
  bfg: {
    idle: [
      '╔══════════╗',
      '║██████████║',
      '╠════●════╣',
      '║█▓▒░░▒▓█║',
      '║██████████║',
      '╠══════════╣',
      '╚══════════╝',
    ],
    fired: [
      '\\██████████/',
      '╔══════════╗',
      '║██████████║',
      '╠════◉════╣',
      '║█▓▒░░▒▓█║',
      '║██████████║',
      '╠══════════╣',
    ],
  },
  flamethrower: {
    idle: [
      '════════════',
      '  ╔══════╗  ',
      '══╣░░░░░░╠══',
      '  ║██████║  ',
      '  ╠══════╣  ',
      '  ║██████║  ',
      '  ╚══════╝  ',
    ],
    fired: [
      '▲▲▲▲▲▲▲▲▲▲▲▲',
      '▓▓▓▓▓▓▓▓▓▓▓▓',
      '░░╔══════╗░░',
      '══╣▓▓▓▓▓▓╠══',
      '  ║██████║  ',
      '  ╠══════╣  ',
      '  ║██████║  ',
    ],
  },
};

// Sprite ASCII art (8 chars wide, 12 tall for detailed enemies)
export const SPRITE_ART: Record<string, Record<string, string[]>> = {
  imp: {
    idle: [
      '   /▲\\   ',
      '  /███\\  ',
      ' │█◉◉█│ ',
      ' │█▄▄█│ ',
      '  \\██/  ',
      '   ██   ',
      '  /██\\  ',
      ' / ▐▌ \\ ',
      '/  ▐▌  \\',
      '   ██   ',
      '  /  \\  ',
      ' /    \\ ',
    ],
    chase: [
      '   /▲\\   ',
      '  /███\\  ',
      ' │█◉◉█│ ',
      ' │█▄▄█│ ',
      '  \\██/  ',
      '   ██   ',
      '  /██\\  ',
      ' / ▐▌ \\ ',
      '  /▐▌\\  ',
      '  ▐▌▐▌  ',
      ' /    \\ ',
      '/      \\',
    ],
    attack: [
      '  \\▲/   ',
      ' \\/███\\/  ',
      ' │█◉◉█│ ',
      ' │█▀▀█│ ',
      '  \\██/  ',
      '  /██\\  ',
      ' / ██ \\ ',
      '/  ▐▌  \\',
      '   ▐▌   ',
      '   ██   ',
      '  /  \\  ',
      ' /    \\ ',
    ],
    pain: [
      '   *▲*   ',
      '  \\███/  ',
      ' │█××█│ ',
      ' │█▄▄█│ ',
      '  \\██/  ',
      '   ██   ',
      '  \\██/  ',
      ' \\ ▐▌ / ',
      '\\  ▐▌  /',
      '   ██   ',
      '  /  \\  ',
      ' /    \\ ',
    ],
    dead: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      ' ______ ',
      ' ▓▓▓▓▓▓ ',
      ' ░░░░░░ ',
      '        ',
    ],
  },
  demon: {
    idle: [
      ' ╔════╗ ',
      '╔╣████╠╗',
      '║██████║',
      '║█◉██◉█║',
      '║██████║',
      '╚╦════╦╝',
      ' ║████║ ',
      ' ║████║ ',
      ' ╠════╣ ',
      '╔╝    ╚╗',
      '║  ██  ║',
      '╚══════╝',
    ],
    chase: [
      ' ╔════╗ ',
      '╔╣████╠╗',
      '║██████║',
      '║█◉██◉█║',
      '║██▀▀██║',
      '╚╦════╦╝',
      ' ║████║ ',
      ' ╠════╣ ',
      '╔╝    ╚╗',
      '║ ▐██▌ ║',
      '║ ▐▌▐▌ ║',
      '╚══════╝',
    ],
    attack: [
      '\\╔════╗/',
      '╔╣████╠╗',
      '║██████║',
      '║█◉██◉█║',
      '║██▼▼██║',
      '╚╦═══╦╝',
      ' ║████║ ',
      ' ║████║ ',
      ' ╠════╣ ',
      '╔╝    ╚╗',
      '║  ██  ║',
      '╚══════╝',
    ],
    pain: [
      ' ╔═**═╗ ',
      '╔╣████╠╗',
      '║██████║',
      '║█××██║',
      '║██████║',
      '╚╦════╦╝',
      ' \\████/ ',
      ' \\████/ ',
      ' ╠════╣ ',
      '╔╝    ╚╗',
      '║  ██  ║',
      '╚══════╝',
    ],
    dead: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '════════',
      '████████',
      '▓▓▓▓▓▓▓▓',
      '        ',
    ],
  },
  cacodemon: {
    idle: [
      ' ╭──────╮ ',
      '╱████████╲',
      '│████████│',
      '│███◉◉███│',
      '│████████│',
      '│███╲__╱██│',
      '│████████│',
      '╲████████╱',
      ' ╰──────╯ ',
      '   ▼▼▼▼   ',
      '  ▼▼▼▼▼▼  ',
      '   ▼▼▼▼   ',
    ],
    chase: [
      ' ╭──────╮ ',
      '╱████████╲',
      '│████████│',
      '│██◉██◉██│',
      '│████████│',
      '│███╲__╱██│',
      '│████████│',
      '╲████████╱',
      ' ╰──────╯ ',
      '  ▼▼▼▼▼▼  ',
      '   ▼▼▼▼   ',
      '    ▼▼    ',
    ],
    attack: [
      ' ╭──────╮ ',
      '╱████████╲',
      '│████████│',
      '│███◉◉███│',
      '│████████│',
      '│███╔══╗██│',
      '│████████│',
      '╲████████╱',
      ' ╰──────╯ ',
      '   ◆◆◆◆   ',
      '  ◆◆◆◆◆◆  ',
      '   ◆◆◆◆   ',
    ],
    pain: [
      ' ╭──────╮ ',
      '╱████████╲',
      '│█*████*█│',
      '│███××███│',
      '│████████│',
      '│███\\__/██│',
      '│████████│',
      '╲████████╱',
      ' ╰──────╯ ',
      '   ▼▼▼▼   ',
      '  ▼▼▼▼▼▼  ',
      '   ▼▼▼▼   ',
    ],
    dead: [
      '        ',
      '        ',
      '        ',
      '        ',
      ' ╭────╮ ',
      '╱░░░░░░╲',
      '│░░░░░░│',
      '╲░░░░░░╱',
      ' ╰────╯ ',
      '  ▼▼▼▼  ',
      '   ▼▼   ',
      '        ',
    ],
  },
  baron: {
    idle: [
      ' ╱╲    ╱╲ ',
      '╱██╲  ╱██╲',
      '│████████│',
      '│██◉◉██│',
      ' \\████/ ',
      '  ████  ',
      ' ██████ ',
      ' ██  ██ ',
      ' ██  ██ ',
      '╱██╲╱██╲',
      '██    ██',
      '██    ██',
    ],
    chase: [
      ' ╱╲    ╱╲ ',
      '╱██╲  ╱██╲',
      '│████████│',
      '│██◉◉██│',
      ' \\████/ ',
      '  ████  ',
      ' ██████ ',
      ' ▐▌  ▐▌ ',
      ' ▐▌  ▐▌ ',
      '╱██╲╱██╲',
      '█      █',
      '██    ██',
    ],
    attack: [
      '\\╱╲    ╱╲/',
      '╱██╲  ╱██╲',
      '│████████│',
      '│██◉◉██│',
      ' \\█▀▀█/ ',
      ' /████\\ ',
      ' ██████ ',
      ' ██  ██ ',
      ' ██  ██ ',
      '╱██╲╱██╲',
      '██    ██',
      '██    ██',
    ],
    pain: [
      ' *╱╲  ╱╲* ',
      '╱██╲  ╱██╲',
      '│████████│',
      '│██××██│',
      ' \\████/ ',
      '  \\██/  ',
      ' ██████ ',
      ' ██  ██ ',
      ' ██  ██ ',
      '╱██╲╱██╲',
      '██    ██',
      '██    ██',
    ],
    dead: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '════════',
      '████████',
      '▓▓▓▓▓▓▓▓',
      '░░░░░░░░',
    ],
  },
  cyberdemon: {
    idle: [
      '╔═╗████╔═╗',
      '║█║████║█║',
      '║████████║',
      '║██◉◉██║',
      '║████████╠═',
      '║████████║',
      ' ╠══════╣ ',
      ' ║██████║ ',
      '╔╝██████╚╗',
      '║████████║',
      '║██    ██║',
      '╚══╝  ╚══╝',
    ],
    chase: [
      '╔═╗████╔═╗',
      '║█║████║█║',
      '║████████║',
      '║██◉◉██║',
      '║████████╠═',
      '║████████║',
      ' ╠══════╣ ',
      ' ║▐████▌║ ',
      '╔╝▐▌██▐▌╚╗',
      '║ ▐▌  ▐▌ ║',
      '║██    ██║',
      '╚══╝  ╚══╝',
    ],
    attack: [
      '╔═╗████╔═╗',
      '║█║████║█║',
      '║████████║',
      '║██◉◉██║',
      '║████████╠══●',
      '║████████║',
      ' ╠══════╣ ',
      ' ║██████║ ',
      '╔╝██████╚╗',
      '║████████║',
      '║██    ██║',
      '╚══╝  ╚══╝',
    ],
    pain: [
      '╔═╗*██*╔═╗',
      '║█║████║█║',
      '║████████║',
      '║██××██║',
      '║████████╠═',
      '\\████████/',
      ' ╠══════╣ ',
      ' \\██████/ ',
      '╔╝██████╚╗',
      '║████████║',
      '║██    ██║',
      '╚══╝  ╚══╝',
    ],
    dead: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '════════',
      '████████',
      '████████',
      '▓▓▓▓▓▓▓▓',
      '░░░░░░░░',
      '        ',
    ],
  },
  health: {
    idle: [
      '        ',
      '        ',
      '        ',
      '  ╔══╗  ',
      '  ║++║  ',
      '  ║++║  ',
      '  ╚══╝  ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  armor: {
    idle: [
      '        ',
      '        ',
      '        ',
      ' ╔════╗ ',
      ' ║████║ ',
      ' ║████║ ',
      ' ╚╦══╦╝ ',
      '  ╚══╝  ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  ammo_bullets: {
    idle: [
      '        ',
      '        ',
      '        ',
      '  ┌──┐  ',
      '  │██│  ',
      '  │██│  ',
      '  └──┘  ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  ammo_shells: {
    idle: [
      '        ',
      '        ',
      '        ',
      ' ┌┐┌┐┌┐ ',
      ' ││││││ ',
      ' └┘└┘└┘ ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  ammo_rockets: {
    idle: [
      '        ',
      '        ',
      '        ',
      '  ◄══►  ',
      '  ║██║  ',
      '  ╚══╝  ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  ammo_cells: {
    idle: [
      '        ',
      '        ',
      '        ',
      '  ╔══╗  ',
      '  ║◆◆║  ',
      '  ║◆◆║  ',
      '  ╚══╝  ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  ammo_fuel: {
    idle: [
      '        ',
      '        ',
      '        ',
      '  ╔══╗  ',
      '  ║▓▓║  ',
      '  ║░░║  ',
      '  ╚══╝  ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
    ],
  },
  corpse: {
    idle: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      ' ______ ',
      ' ░▒▓▒░ ',
      ' ░░░░░░ ',
      '        ',
    ],
  },
  gib: {
    idle: [
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '        ',
      '   ▓▓   ',
      '  ░▒░   ',
      '        ',
    ],
  },
};

export const SPRITE_COLOURS: Record<string, string> = {
  imp: '#ff6600',       // Orange
  demon: '#cc3366',     // Pink
  cacodemon: '#ff0000', // Bright red
  baron: '#44ff44',     // Hell green
  cyberdemon: '#888899',// Metal gray
  health: '#00ff00',
  armor: '#0066ff',
  ammo_bullets: '#ffcc00',
  ammo_shells: '#ff8800',
  ammo_rockets: '#ff4400',
  ammo_cells: '#00ffff',
  ammo_fuel: '#ff6600', // Orange fuel canister
  corpse: '#442222',
  gib: '#880000',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private zBuffer: number[];
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private animTime: number = 0;
  private lights: LightSource[] = [];
  private muzzleFlash: number = 0;  // Intensity of player muzzle flash
  private ambientLight: number = 0.3;  // Base ambient lighting
  private splitScreen: boolean = false;
  private currentViewport: { x: number; width: number } = { x: 0, width: 0 };

  // Combat feedback effects
  private hitMarker: { timer: number } = { timer: 0 };
  private killMessage: { text: string; timer: number; colour: string } = { text: '', timer: 0, colour: '#ffffff' };
  private weaponBobPhase: number = 0;
  private isMoving: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.canvas = canvas;
    this.config = config;
    this.zBuffer = new Array(config.screenWidth).fill(Infinity);

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

  /** Enable or disable split-screen mode */
  setSplitScreen(enabled: boolean): void {
    this.splitScreen = enabled;
  }

  /** Get if split screen is enabled */
  isSplitScreen(): boolean {
    return this.splitScreen;
  }

  /** Set up viewport for a specific player in split-screen */
  setViewport(playerId: 1 | 2): void {
    if (!this.splitScreen) {
      this.currentViewport = { x: 0, width: this.config.screenWidth };
      return;
    }

    const halfWidth = Math.floor(this.config.screenWidth / 2);
    if (playerId === 1) {
      this.currentViewport = { x: 0, width: halfWidth };
    } else {
      this.currentViewport = { x: halfWidth, width: halfWidth };
    }
  }

  /** Get current viewport info */
  getViewport(): { x: number; width: number } {
    return this.currentViewport;
  }

  /** Update animation time */
  updateAnimation(deltaTime: number): void {
    this.animTime += deltaTime;
    // Decay muzzle flash
    this.muzzleFlash = Math.max(0, this.muzzleFlash - deltaTime * 8);
    // Decay hit marker
    this.hitMarker.timer = Math.max(0, this.hitMarker.timer - deltaTime);
    // Decay kill message
    this.killMessage.timer = Math.max(0, this.killMessage.timer - deltaTime);
    // Update weapon bob phase when moving
    if (this.isMoving) {
      this.weaponBobPhase += deltaTime * 10;
    }
  }

  /** Show hit marker (call when bullet hits enemy) */
  showHitMarker(): void {
    this.hitMarker.timer = 0.15; // Show for 150ms
  }

  /** Show kill message (call when enemy dies) */
  showKillMessage(enemyType: string): void {
    const colours: Record<string, string> = {
      imp: '#ff6600',
      demon: '#cc3366',
      cacodemon: '#ff0000',
      baron: '#44ff44',
      cyberdemon: '#888899',
    };
    this.killMessage.text = `KILLED ${enemyType.toUpperCase()}`;
    this.killMessage.timer = 1.5; // Show for 1.5s
    this.killMessage.colour = colours[enemyType] || '#ffffff';
  }

  /** Set moving state for weapon bob */
  setMoving(moving: boolean): void {
    this.isMoving = moving;
  }

  /** Get current animation time */
  getAnimTime(): number {
    return this.animTime;
  }

  /** Set muzzle flash intensity (called when weapon fires) */
  setMuzzleFlash(intensity: number): void {
    this.muzzleFlash = Math.max(this.muzzleFlash, intensity);
  }

  /** Add a light source */
  addLight(light: LightSource): void {
    this.lights.push(light);
  }

  /** Clear all dynamic lights */
  clearLights(): void {
    this.lights = [];
  }

  /** Calculate lighting at a world position */
  private calculateLighting(worldPos: Vec2, playerPos: Vec2): number {
    let totalLight = this.ambientLight;

    // Add muzzle flash (from player position)
    if (this.muzzleFlash > 0) {
      const dx = worldPos.x - playerPos.x;
      const dy = worldPos.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const flashRadius = 6;
      if (dist < flashRadius) {
        const falloff = 1 - (dist / flashRadius);
        totalLight += this.muzzleFlash * falloff * 0.8;
      }
    }

    // Add dynamic lights
    for (const light of this.lights) {
      const dx = worldPos.x - light.pos.x;
      const dy = worldPos.y - light.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < light.radius) {
        let intensity = light.intensity;

        // Apply flicker effect
        if (light.flicker) {
          const phase = light.flickerPhase || 0;
          const flicker = Math.sin(this.animTime * 15 + phase) * 0.2 +
                          Math.sin(this.animTime * 7 + phase * 2) * 0.1;
          intensity *= (0.7 + flicker);
        }

        // Distance falloff
        const falloff = 1 - (dist / light.radius);
        totalLight += intensity * falloff * falloff;
      }
    }

    return Math.min(1, totalLight);
  }

  /** Apply lighting to a colour */
  private applyLighting(hex: string, lighting: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Apply lighting
    const lr = Math.floor(Math.min(255, r * lighting));
    const lg = Math.floor(Math.min(255, g * lighting));
    const lb = Math.floor(Math.min(255, b * lighting));

    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  }

  /** Apply screen shake offset */
  applyScreenShake(intensity: number): void {
    if (intensity > 0) {
      this.shakeOffset = {
        x: (Math.random() - 0.5) * intensity * 10,
        y: (Math.random() - 0.5) * intensity * 10,
      };
    } else {
      this.shakeOffset = { x: 0, y: 0 };
    }
  }

  /** Clear screen with black background */
  clear(): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Save transform
    this.ctx.save();
    this.ctx.translate(this.shakeOffset.x, this.shakeOffset.y);

    if (this.splitScreen) {
      // Only clear the current viewport
      const vp = this.currentViewport;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(vp.x * cellWidth, 0, vp.width * cellWidth, screenHeight * cellHeight);

      // Reset only the viewport portion of z-buffer
      for (let i = vp.x; i < vp.x + vp.width; i++) {
        this.zBuffer[i] = Infinity;
      }
    } else {
      // Full screen clear
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);
      this.zBuffer.fill(Infinity);
    }
  }

  /** Draw the split-screen divider */
  drawSplitDivider(): void {
    if (!this.splitScreen) return;

    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;
    const midX = Math.floor(screenWidth / 2) * cellWidth;

    this.ctx.fillStyle = '#444444';
    this.ctx.fillRect(midX - 1, 0, 3, screenHeight * cellHeight);
  }

  /** Draw textured floor and ceiling */
  drawFloorCeiling(player: Player, rays: RayHit[]): void {
    const { screenHeight, cellWidth, cellHeight } = this.config;
    const vp = this.splitScreen ? this.currentViewport : { x: 0, width: this.config.screenWidth };
    const screenWidth = vp.width;

    // For each column, draw floor and ceiling pixels
    for (let i = 0; i < screenWidth; i++) {
      const x = vp.x + i;
      const ray = rays[i];

      // Calculate ray direction for this column
      const cameraX = (2 * x) / screenWidth - 1;
      const rayDirX = player.dir.x + player.plane.x * cameraX;
      const rayDirY = player.dir.y + player.plane.y * cameraX;

      // Calculate wall height and bounds
      const wallHeight = Math.floor(screenHeight / ray.distance);
      const wallTop = Math.max(0, Math.floor((screenHeight - wallHeight) / 2));
      const wallBottom = Math.min(screenHeight, Math.floor((screenHeight + wallHeight) / 2));

      // Draw ceiling (from top to wall top)
      for (let y = 0; y < wallTop; y++) {
        // Calculate row distance
        const rowDistance = screenHeight / (screenHeight - 2 * y);

        // Calculate world coordinates
        const floorX = player.pos.x + rowDistance * rayDirX;
        const floorY = player.pos.y + rowDistance * rayDirY;

        // Sample ceiling texture (animated starfield)
        const sample = sampleCeilingTexture(floorX, floorY, rowDistance, 0, this.animTime);

        this.ctx.fillStyle = sample.colour;
        this.ctx.fillText(sample.char, x * cellWidth, y * cellHeight);
      }

      // Draw floor (from wall bottom to screen bottom)
      for (let y = wallBottom; y < screenHeight; y++) {
        // Calculate row distance
        const rowDistance = screenHeight / (2 * y - screenHeight);

        // Calculate world coordinates
        const floorX = player.pos.x + rowDistance * rayDirX;
        const floorY = player.pos.y + rowDistance * rayDirY;

        // Sample floor texture
        const sample = sampleFloorTexture(floorX, floorY, rowDistance, 0);

        // Apply dynamic lighting
        const lighting = this.calculateLighting({ x: floorX, y: floorY }, player.pos);
        const litColour = this.applyLighting(sample.colour, lighting);

        this.ctx.fillStyle = litColour;
        this.ctx.fillText(sample.char, x * cellWidth, y * cellHeight);
      }
    }
  }

  /** Restore transform after rendering */
  endFrame(): void {
    this.ctx.restore();
  }

  /** Apply post-processing effects (minimal for clarity) */
  applyPostProcessing(): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;
    const width = screenWidth * cellWidth;
    const height = screenHeight * cellHeight;

    // Very subtle vignette only - keeps edges visible but adds atmosphere
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, height * 0.5,
      width / 2, height / 2, height * 0.95
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // No scanlines, no grain, no chromatic aberration - clarity first!
  }

  /** Apply color grading for atmosphere */
  applyColorGrading(tint: string, intensity: number = 0.1): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;
    const width = screenWidth * cellWidth;
    const height = screenHeight * cellHeight;

    // Parse tint color
    const r = parseInt(tint.slice(1, 3), 16);
    const g = parseInt(tint.slice(3, 5), 16);
    const b = parseInt(tint.slice(5, 7), 16);

    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${intensity})`;
    this.ctx.fillRect(0, 0, width, height);
  }

  /** Draw a vertical strip of textured wall */
  drawWallStrip(
    x: number,
    wallHeight: number,
    distance: number,
    side: 0 | 1,
    wallType: number,
    wallX: number
  ): void {
    const { screenHeight, cellWidth, cellHeight } = this.config;

    // Store distance in z-buffer for sprite occlusion
    this.zBuffer[x] = distance;

    // Calculate draw bounds
    const drawHeight = Math.min(wallHeight, screenHeight);
    const startY = Math.floor((screenHeight - drawHeight) / 2);

    // Calculate texture V coordinates
    const texStartV = wallHeight > screenHeight
      ? (wallHeight - screenHeight) / (2 * wallHeight)
      : 0;
    const texEndV = wallHeight > screenHeight
      ? 1 - texStartV
      : 1;

    // Sample the texture
    const samples = sampleWallStrip(
      wallType,
      wallX,
      texStartV,
      texEndV,
      drawHeight,
      distance
    );

    // Apply side darkening (E/W walls are darker)
    const sideFactor = side === 1 ? 0.7 : 1.0;

    // Draw the vertical strip
    for (let y = 0; y < drawHeight; y++) {
      const screenY = startY + y;
      const sample = samples[y];

      // Darken colour for side
      let colour = sample.colour;
      if (sideFactor < 1) {
        colour = this.darkenColour(colour, sideFactor);
      }

      this.ctx.fillStyle = colour;
      this.ctx.fillText(
        sample.char,
        x * cellWidth,
        screenY * cellHeight
      );
    }
  }

  /** Draw a sprite column (for sprite rendering) */
  drawSpriteColumn(
    screenX: number,
    spriteScreenY: number,
    spriteHeight: number,
    spriteType: string,
    spriteState: string,
    columnIndex: number,
    totalColumns: number,
    distance: number
  ): void {
    // Check z-buffer - only draw if closer than wall
    if (distance >= this.zBuffer[screenX]) {
      return;
    }

    const { screenHeight, cellWidth, cellHeight } = this.config;
    const art = SPRITE_ART[spriteType]?.[spriteState] || SPRITE_ART[spriteType]?.['idle'];
    if (!art) return;

    const colour = SPRITE_COLOURS[spriteType] || '#ffffff';
    const artWidth = art[0].length;
    const artHeight = art.length;

    // Map column index to art column
    const artX = Math.floor((columnIndex / totalColumns) * artWidth);
    if (artX < 0 || artX >= artWidth) return;

    // Calculate vertical scaling
    const drawHeight = Math.min(spriteHeight, screenHeight);
    const startY = spriteScreenY;

    // Draw each character in this column
    for (let i = 0; i < drawHeight; i++) {
      const screenY = startY + i;
      if (screenY < 0 || screenY >= screenHeight) continue;

      // Map to art row
      const artY = Math.floor((i / spriteHeight) * artHeight);
      if (artY < 0 || artY >= artHeight) continue;

      const char = art[artY][artX];
      if (char === ' ') continue; // Transparent

      // Apply distance fade (less aggressive - enemies stay visible)
      const brightness = Math.max(0.5, 1 - (distance / 15));
      const fadedColour = this.darkenColour(colour, brightness);

      this.ctx.fillStyle = fadedColour;
      this.ctx.fillText(char, screenX * cellWidth, screenY * cellHeight);
    }
  }

  /** Draw weapon overlay at bottom of screen */
  drawWeapon(weapon: WeaponState): void {
    const { screenHeight, cellWidth, cellHeight } = this.config;
    const vp = this.splitScreen ? this.currentViewport : { x: 0, width: this.config.screenWidth };
    const screenWidth = vp.width;
    const offsetX = vp.x;

    const art = weapon.isFiring
      ? WEAPON_ART[weapon.type].fired
      : WEAPON_ART[weapon.type].idle;

    const weaponWidth = art[0].length;
    const startX = offsetX + Math.floor((screenWidth - weaponWidth) / 2);

    // Weapon bob when moving (subtle up/down motion)
    const bobOffset = this.isMoving ? Math.sin(this.weaponBobPhase) * 0.5 : 0;
    const startY = screenHeight - art.length + bobOffset;

    this.ctx.fillStyle = '#cccccc';
    for (let y = 0; y < art.length; y++) {
      for (let x = 0; x < art[y].length; x++) {
        const char = art[y][x];
        if (char !== ' ') {
          // Muzzle flash colour
          if (weapon.isFiring && y === 0 && (char === '\\' || char === '/' || char === '█')) {
            this.ctx.fillStyle = '#ffff00';
          } else {
            this.ctx.fillStyle = '#cccccc';
          }
          this.ctx.fillText(char, (startX + x) * cellWidth, (startY + y) * cellHeight);
        }
      }
    }
  }

  /** Draw HUD overlay */
  drawHUD(player: Player, weapon?: WeaponState, killCount?: number, playerId?: 1 | 2): void {
    const { screenHeight, cellWidth, cellHeight } = this.config;
    const vp = this.splitScreen ? this.currentViewport : { x: 0, width: this.config.screenWidth };
    const screenWidth = vp.width;
    const offsetX = vp.x;

    // HUD background bar
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(offsetX * cellWidth, (screenHeight - 3) * cellHeight, screenWidth * cellWidth, 3 * cellHeight);

    // Player label for split-screen
    if (this.splitScreen && playerId) {
      const playerLabel = playerId === 1 ? 'P1' : 'P2';
      const playerColour = playerId === 1 ? '#00ff00' : '#00ffff';
      this.ctx.fillStyle = playerColour;
      this.ctx.fillText(playerLabel, (offsetX + 1) * cellWidth, 1 * cellHeight);
    }

    // Health bar (compact for split-screen)
    const healthBarWidth = this.splitScreen ? 10 : 20;
    const healthFilled = Math.ceil((player.health / 100) * healthBarWidth);
    const healthEmpty = healthBarWidth - healthFilled;
    const healthBar = '█'.repeat(Math.max(0, healthFilled)) + '░'.repeat(Math.max(0, healthEmpty));

    // Health colour based on amount
    let healthColour = '#00ff00';
    if (player.health <= 25) healthColour = '#ff0000';
    else if (player.health <= 50) healthColour = '#ffff00';

    // Draw health
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('HP:', (offsetX + 1) * cellWidth, (screenHeight - 2) * cellHeight);
    this.ctx.fillStyle = healthColour;
    this.ctx.fillText(healthBar, (offsetX + 4) * cellWidth, (screenHeight - 2) * cellHeight);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${player.health}`, (offsetX + 4 + healthBarWidth + 1) * cellWidth, (screenHeight - 2) * cellHeight);

    // Weapon name and ammo (bottom row) - compact for split-screen
    if (weapon) {
      const weaponName = weapon.type.toUpperCase().slice(0, 4);
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillText(`[${weaponName}]`, (offsetX + 1) * cellWidth, (screenHeight - 1) * cellHeight);

      // Low ammo thresholds - flash red when below
      const lowAmmo = { bullets: 20, shells: 5, rockets: 2, cells: 20, fuel: 20 };
      const flashOn = Math.sin(this.animTime * 8) > 0;

      // Helper to get ammo colour (flashes red when low)
      const getAmmoColour = (amount: number, threshold: number, baseColour: string): string => {
        if (amount <= threshold && flashOn) return '#ff0000';
        if (amount <= threshold) return '#880000';
        return baseColour;
      };

      if (this.splitScreen) {
        // Compact ammo display for split-screen
        this.ctx.fillStyle = getAmmoColour(player.ammo.bullets, lowAmmo.bullets, '#ffcc00');
        this.ctx.fillText(`•${player.ammo.bullets}`, (offsetX + 9) * cellWidth, (screenHeight - 1) * cellHeight);
        this.ctx.fillStyle = getAmmoColour(player.ammo.shells, lowAmmo.shells, '#ff8800');
        this.ctx.fillText(`▪${player.ammo.shells}`, (offsetX + 14) * cellWidth, (screenHeight - 1) * cellHeight);
      } else {
        // Full ammo display for single player
        this.ctx.fillStyle = getAmmoColour(player.ammo.bullets, lowAmmo.bullets, '#ffcc00');
        this.ctx.fillText(`•${player.ammo.bullets}`, (offsetX + 15) * cellWidth, (screenHeight - 1) * cellHeight);
        this.ctx.fillStyle = getAmmoColour(player.ammo.shells, lowAmmo.shells, '#ff8800');
        this.ctx.fillText(`▪${player.ammo.shells}`, (offsetX + 22) * cellWidth, (screenHeight - 1) * cellHeight);
        this.ctx.fillStyle = getAmmoColour(player.ammo.rockets, lowAmmo.rockets, '#ff4400');
        this.ctx.fillText(`◆${player.ammo.rockets}`, (offsetX + 28) * cellWidth, (screenHeight - 1) * cellHeight);
        this.ctx.fillStyle = getAmmoColour(player.ammo.cells, lowAmmo.cells, '#00ffff');
        this.ctx.fillText(`●${player.ammo.cells}`, (offsetX + 34) * cellWidth, (screenHeight - 1) * cellHeight);
        this.ctx.fillStyle = getAmmoColour(player.ammo.fuel, lowAmmo.fuel, '#ff6600');
        this.ctx.fillText(`▲${player.ammo.fuel}`, (offsetX + 40) * cellWidth, (screenHeight - 1) * cellHeight);
      }
    }

    // Kill count (top area for split-screen)
    if (killCount !== undefined && !this.splitScreen) {
      this.ctx.fillStyle = '#ff4444';
      this.ctx.fillText(`KILLS: ${killCount}`, (offsetX + screenWidth - 12) * cellWidth, (screenHeight - 1) * cellHeight);
    }

    // Credits display (single player only, top-right area)
    if (!this.splitScreen) {
      const shopState = loadShopState();
      this.ctx.fillStyle = '#ffdd00';
      this.ctx.fillText(`¤ ${shopState.credits}`, (offsetX + screenWidth - 10) * cellWidth, 3 * cellHeight);
    }

    // Hit marker (red X that flashes on successful hit)
    if (this.hitMarker.timer > 0) {
      const alpha = this.hitMarker.timer / 0.15;
      this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      this.ctx.font = `${cellHeight * 1.5}px monospace`;
      this.ctx.fillText('╳', (offsetX + screenWidth / 2 - 0.5) * cellWidth, (screenHeight / 2 - 1) * cellHeight);
      this.ctx.font = `${cellHeight}px monospace`;
    }

    // Crosshair - bright green for visibility
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText('╬', (offsetX + screenWidth / 2) * cellWidth, (screenHeight / 2) * cellHeight);

    // Kill message (shows enemy type when killed)
    if (this.killMessage.timer > 0) {
      const alpha = Math.min(1, this.killMessage.timer);
      this.ctx.fillStyle = this.killMessage.colour.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');
      // Convert hex to rgba
      const hex = this.killMessage.colour;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.ctx.font = `${cellHeight * 1.5}px monospace`;
      const textWidth = this.killMessage.text.length * cellWidth * 0.9;
      this.ctx.fillText(this.killMessage.text, (offsetX + screenWidth / 2) * cellWidth - textWidth / 2, 8 * cellHeight);
      this.ctx.font = `${cellHeight}px monospace`;
    }

    // Help hint (top right) - only in single player
    if (!this.splitScreen) {
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText('[H] Help', (offsetX + screenWidth - 10) * cellWidth, 1 * cellHeight);
    }

    // Damage flash overlay (vignette effect)
    if (player.damageFlash > 0) {
      const centerX = (offsetX + screenWidth / 2) * cellWidth;
      const centerY = screenHeight * cellHeight / 2;
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, screenWidth * cellWidth / 2
      );
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(255, 0, 0, ${player.damageFlash * 0.5})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(offsetX * cellWidth, 0, screenWidth * cellWidth, screenHeight * cellHeight);

      // Damage direction indicator (arrows at screen edges)
      if (player.damageDirection) {
        const alpha = player.damageFlash;
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.font = `${cellHeight * 2}px monospace`;

        // Calculate relative direction (in player's view space)
        const relX = player.damageDirection.x * player.dir.x + player.damageDirection.y * player.dir.y;
        const relY = player.damageDirection.x * (-player.dir.y) + player.damageDirection.y * player.dir.x;

        // Draw arrows based on direction
        const edgeMargin = 3;
        if (relX > 0.3) {
          // Damage from front - show at top
          this.ctx.fillText('▼', centerX - cellWidth, edgeMargin * cellHeight);
        }
        if (relX < -0.3) {
          // Damage from behind - show at bottom
          this.ctx.fillText('▲', centerX - cellWidth, (screenHeight - edgeMargin - 2) * cellHeight);
        }
        if (relY > 0.3) {
          // Damage from left
          this.ctx.fillText('►', (offsetX + edgeMargin) * cellWidth, centerY);
        }
        if (relY < -0.3) {
          // Damage from right
          this.ctx.fillText('◄', (offsetX + screenWidth - edgeMargin - 2) * cellWidth, centerY);
        }

        this.ctx.font = `${cellHeight}px monospace`;
      }
    }

    // Death screen
    if (player.isDead) {
      this.ctx.fillStyle = 'rgba(128, 0, 0, 0.7)';
      this.ctx.fillRect(offsetX * cellWidth, 0, screenWidth * cellWidth, screenHeight * cellHeight);

      this.ctx.fillStyle = '#ff0000';
      this.ctx.font = `${cellHeight * 2}px monospace`;
      const text = 'YOU DIED';
      const textWidth = text.length * cellWidth * 2;
      this.ctx.fillText(text, (screenWidth * cellWidth - textWidth) / 2, (screenHeight / 2) * cellHeight);

      this.ctx.font = `${cellHeight}px monospace`;
      const subtext = 'Press R to restart';
      const subtextWidth = subtext.length * cellWidth;
      this.ctx.fillText(subtext, (screenWidth * cellWidth - subtextWidth) / 2, (screenHeight / 2 + 3) * cellHeight);
    }
  }

  /** Draw gore particles */
  drawGoreParticles(particles: GoreParticle[], player: Player): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    for (const p of particles) {
      // Transform particle position to screen space
      const dx = p.pos.x - player.pos.x;
      const dy = p.pos.y - player.pos.y;

      // Simple 2D projection (particles are rendered in world space, not 3D)
      const invDet = 1 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);
      const transformX = invDet * (player.dir.y * dx - player.dir.x * dy);
      const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy);

      // Behind camera?
      if (transformY <= 0.1) continue;

      // Calculate screen position
      const screenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
      const screenY = Math.floor(screenHeight / 2 + (p.vel.y * 2) / transformY);

      // Out of bounds?
      if (screenX < 0 || screenX >= screenWidth || screenY < 0 || screenY >= screenHeight) continue;

      // Distance check against z-buffer
      if (transformY >= this.zBuffer[screenX]) continue;

      // Fade based on life
      const alpha = p.life / p.maxLife;
      const colour = this.fadeColour(p.colour, alpha);

      this.ctx.fillStyle = colour;
      this.ctx.fillText(p.char, screenX * cellWidth, screenY * cellHeight);
    }
  }

  /** Draw blood decals on floor */
  drawBloodDecals(decals: BloodDecal[], player: Player): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;
    const decalChars = ['▪', '●', '◉', '▓'];

    for (const d of decals) {
      // Transform decal position to screen space
      const dx = d.x - player.pos.x;
      const dy = d.y - player.pos.y;

      const invDet = 1 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);
      const transformX = invDet * (player.dir.y * dx - player.dir.x * dy);
      const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy);

      // Behind camera?
      if (transformY <= 0.5) continue;

      // Calculate screen position (on floor)
      const screenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
      const floorY = Math.floor(screenHeight / 2 + screenHeight / (transformY * 2));

      // Out of bounds?
      if (screenX < 0 || screenX >= screenWidth || floorY < 0 || floorY >= screenHeight) continue;

      // Distance check
      if (transformY >= this.zBuffer[screenX]) continue;

      // Fade based on age (60 second lifetime)
      const alpha = Math.max(0, 1 - d.age / 60);
      const colour = this.fadeColour('#880000', alpha);

      const char = decalChars[Math.min(d.size - 1, decalChars.length - 1)];

      this.ctx.fillStyle = colour;
      this.ctx.fillText(char, screenX * cellWidth, floorY * cellHeight);
    }
  }

  /** Fade a hex colour by alpha */
  private fadeColour(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /** Draw FPS counter */
  drawFPS(fps: number): void {
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText(`FPS: ${Math.round(fps)}`, 5, 5);
  }

  /** Draw main menu / mode select screen */
  drawMainMenu(selectedOption: number, leaderboard?: Leaderboard): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Animated starfield background
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = ((i * 137 + Math.floor(this.animTime * 20)) % screenWidth);
      const y = ((i * 89) % screenHeight);
      const char = i % 3 === 0 ? '★' : '·';
      this.ctx.fillStyle = i % 5 === 0 ? '#ffffff' : '#666688';
      this.ctx.fillText(char, x * cellWidth, y * cellHeight);
    }

    // Title - big ASCII art
    const titleY = 8;
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = `${cellHeight * 3}px monospace`;
    const title = 'TEXT DOOM';
    const titleWidth = title.length * cellWidth * 1.8;
    this.ctx.fillText(title, (screenWidth * cellWidth - titleWidth) / 2, titleY * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    // Subtitle
    this.ctx.fillStyle = '#888888';
    const subtitle = 'An ASCII Raycaster';
    this.ctx.fillText(subtitle, (screenWidth * cellWidth - subtitle.length * cellWidth) / 2, (titleY + 5) * cellHeight);

    // Menu options
    const menuY = 20;
    const options = [
      { label: '1 PLAYER', desc: 'Solo demon slaying' },
      { label: '2 PLAYERS LOCAL', desc: 'Split-screen co-op' },
      { label: 'HOST ONLINE', desc: 'Create a game for a friend to join' },
      { label: 'JOIN ONLINE', desc: 'Join a friend\'s game with a code' },
      { label: 'ARMOURY', desc: 'Upgrade your weapons with credits' },
    ];

    for (let i = 0; i < options.length; i++) {
      const isSelected = i === selectedOption;
      const y = menuY + i * 3;

      // Selection indicator
      if (isSelected) {
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText('>>>', (screenWidth / 2 - 14) * cellWidth, y * cellHeight);
        this.ctx.fillText('<<<', (screenWidth / 2 + 11) * cellWidth, y * cellHeight);
      }

      // Option label
      this.ctx.fillStyle = isSelected ? '#ffff00' : '#888888';
      const label = options[i].label;
      this.ctx.fillText(label, (screenWidth * cellWidth - label.length * cellWidth) / 2, y * cellHeight);

      // Description
      this.ctx.fillStyle = isSelected ? '#aaaaaa' : '#555555';
      const desc = options[i].desc;
      this.ctx.fillText(desc, (screenWidth * cellWidth - desc.length * cellWidth) / 2, (y + 1) * cellHeight);
    }

    // Instructions
    const instrY = 40;
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText('Use ↑↓ or W/S to select', (screenWidth * cellWidth - 24 * cellWidth) / 2, instrY * cellHeight);
    this.ctx.fillText('Press SPACE or ENTER to start', (screenWidth * cellWidth - 30 * cellWidth) / 2, (instrY + 2) * cellHeight);

    // Credits
    this.ctx.fillStyle = '#444444';
    this.ctx.fillText('Press H for controls help', (screenWidth * cellWidth - 26 * cellWidth) / 2, (screenHeight - 4) * cellHeight);

    // Leaderboards (left and right panels) - always show
    const panelWidth = 28;
    const leftX = 8;
    const rightX = screenWidth - panelWidth - 8;
    const panelY = 18;

    // Left panel: TOP KILLS
    this.ctx.fillStyle = '#ff6600';
    this.ctx.fillText('══ TOP KILLS ══', leftX * cellWidth, panelY * cellHeight);

    if (leaderboard && leaderboard.topKills.length > 0) {
      for (let i = 0; i < Math.min(5, leaderboard.topKills.length); i++) {
        const entry = leaderboard.topKills[i];
        const rank = `${i + 1}.`;
        const name = (entry.username || 'Player').slice(0, 8).padEnd(8);
        const kills = `${entry.kills}`;
        this.ctx.fillStyle = i === 0 ? '#ffff00' : '#aaaaaa';
        this.ctx.fillText(`${rank} ${name} ${kills} kills`, leftX * cellWidth, (panelY + 2 + i) * cellHeight);
      }
    } else {
      this.ctx.fillStyle = '#555555';
      this.ctx.fillText('No games yet', leftX * cellWidth, (panelY + 2) * cellHeight);
      this.ctx.fillText('Play to get on', leftX * cellWidth, (panelY + 3) * cellHeight);
      this.ctx.fillText('the leaderboard!', leftX * cellWidth, (panelY + 4) * cellHeight);
    }

    // Right panel: LONGEST GAMES
    this.ctx.fillStyle = '#00ccff';
    this.ctx.fillText('══ LONGEST GAMES ══', rightX * cellWidth, panelY * cellHeight);

    if (leaderboard && leaderboard.topTime.length > 0) {
      for (let i = 0; i < Math.min(5, leaderboard.topTime.length); i++) {
        const entry = leaderboard.topTime[i];
        const rank = `${i + 1}.`;
        const name = (entry.username || 'Player').slice(0, 8).padEnd(8);
        const time = formatTime(entry.timePlayed);
        this.ctx.fillStyle = i === 0 ? '#ffff00' : '#aaaaaa';
        this.ctx.fillText(`${rank} ${name} ${time}`, rightX * cellWidth, (panelY + 2 + i) * cellHeight);
      }
    } else {
      this.ctx.fillStyle = '#555555';
      this.ctx.fillText('No games yet', rightX * cellWidth, (panelY + 2) * cellHeight);
      this.ctx.fillText('Survive longer', rightX * cellWidth, (panelY + 3) * cellHeight);
      this.ctx.fillText('to rank here!', rightX * cellWidth, (panelY + 4) * cellHeight);
    }

    // Total stats at bottom of panels
    this.ctx.fillStyle = '#666666';
    const totalY = panelY + 8;
    const totalKills = leaderboard?.totalKills ?? 0;
    const gamesPlayed = leaderboard?.gamesPlayed ?? 0;
    const totalTime = leaderboard?.totalTimePlayed ?? 0;
    this.ctx.fillText(`Total: ${totalKills} kills`, leftX * cellWidth, totalY * cellHeight);
    this.ctx.fillText(`Games: ${gamesPlayed}`, rightX * cellWidth, totalY * cellHeight);
    this.ctx.fillText(`Time: ${formatTime(totalTime)}`, (rightX + 12) * cellWidth, totalY * cellHeight);
  }

  /** Draw online lobby screen (host waiting or join code entry) */
  drawOnlineLobby(isHost: boolean, roomCode: string, status: string, inputCode: string): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Animated background
    for (let i = 0; i < 30; i++) {
      const x = ((i * 137 + Math.floor(this.animTime * 10)) % screenWidth);
      const y = ((i * 89) % screenHeight);
      this.ctx.fillStyle = '#222244';
      this.ctx.fillText('·', x * cellWidth, y * cellHeight);
    }

    // Title
    this.ctx.fillStyle = '#00ffff';
    this.ctx.font = `${cellHeight * 2}px monospace`;
    const title = isHost ? 'HOSTING GAME' : 'JOIN GAME';
    this.ctx.fillText(title, (screenWidth * cellWidth - title.length * cellWidth) / 2, 10 * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    if (isHost) {
      // Show room code for host
      this.ctx.fillStyle = '#ffffff';
      const shareText = 'Share this code with your friend:';
      this.ctx.fillText(shareText, (screenWidth * cellWidth - shareText.length * cellWidth) / 2, 18 * cellHeight);

      // Big room code in a box
      const codeX = (screenWidth / 2 - 8) * cellWidth;
      const codeY = 22 * cellHeight;

      // Draw box around code
      this.ctx.fillStyle = '#333366';
      this.ctx.fillRect(codeX, codeY, 16 * cellWidth, 5 * cellHeight);
      this.ctx.strokeStyle = '#ffff00';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(codeX, codeY, 16 * cellWidth, 5 * cellHeight);

      // Room code - large and centered
      this.ctx.fillStyle = '#ffff00';
      this.ctx.font = `bold ${cellHeight * 3}px monospace`;
      const codeDisplay = roomCode || '----';
      // Measure text for proper centering
      const textMetrics = this.ctx.measureText(codeDisplay);
      const textX = codeX + (16 * cellWidth - textMetrics.width) / 2;
      this.ctx.fillText(codeDisplay, textX, codeY + cellHeight * 3.5);

      this.ctx.font = `${cellHeight}px monospace`;

      // Waiting animation
      const dots = '.'.repeat(Math.floor(this.animTime * 2) % 4);
      this.ctx.fillStyle = '#888888';
      const waitText = `Waiting for player to join${dots}`;
      this.ctx.fillText(waitText, (screenWidth * cellWidth - waitText.length * cellWidth) / 2, 32 * cellHeight);
    } else {
      // Join code entry
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText('Enter the 4-letter room code:', (screenWidth * cellWidth - 30 * cellWidth) / 2, 20 * cellHeight);

      // Code input box
      const boxX = (screenWidth / 2 - 6) * cellWidth;
      const boxY = 25 * cellHeight;
      this.ctx.fillStyle = '#333333';
      this.ctx.fillRect(boxX, boxY, 12 * cellWidth, 3 * cellHeight);

      // Entered code
      this.ctx.fillStyle = '#00ff00';
      this.ctx.font = `${cellHeight * 2}px monospace`;
      const displayCode = inputCode.padEnd(4, '_');
      this.ctx.fillText(displayCode, boxX + cellWidth, boxY + cellHeight * 0.5);

      this.ctx.font = `${cellHeight}px monospace`;

      // Instructions
      this.ctx.fillStyle = '#888888';
      this.ctx.fillText('Type the code, then press ENTER', (screenWidth * cellWidth - 32 * cellWidth) / 2, 32 * cellHeight);
    }

    // Status message
    this.ctx.fillStyle = status.includes('Error') || status.includes('failed') ? '#ff4444' : '#00ff00';
    this.ctx.fillText(status, (screenWidth * cellWidth - status.length * cellWidth) / 2, 40 * cellHeight);

    // Back instruction
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText('Press ESC to go back', (screenWidth * cellWidth - 20 * cellWidth) / 2, (screenHeight - 4) * cellHeight);
  }

  /** Draw network status indicator */
  drawNetworkStatus(latency: number, isHost: boolean): void {
    const { screenWidth, cellWidth, cellHeight } = this.config;

    // Network indicator in top right
    const indicator = isHost ? 'HOST' : 'GUEST';
    const pingText = `${latency}ms`;

    this.ctx.fillStyle = latency < 100 ? '#00ff00' : latency < 200 ? '#ffff00' : '#ff0000';
    this.ctx.fillText(`${indicator} | ${pingText}`, (screenWidth - 15) * cellWidth, 2 * cellHeight);
  }

  /** Draw tutorial overlay */
  drawTutorial(): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Title
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = `${cellHeight * 2}px monospace`;
    const title = '╔═══ TEXT DOOM ═══╗';
    this.ctx.fillText(title, (screenWidth * cellWidth - title.length * cellWidth) / 2, 3 * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    // Subtitle - 2 PLAYER MODE
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText('═══ 2 PLAYER SPLIT-SCREEN ═══', 30 * cellWidth, 5 * cellHeight);

    // Player 1 section
    let y = 7;
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText('═══ PLAYER 1 (LEFT) ═══', 10 * cellWidth, y * cellHeight);
    y += 2;

    this.ctx.fillStyle = '#ffffff';
    const p1Controls = [
      'W/S          Forward/Back',
      'A/D          Turn left/right',
      'Q/E          Strafe',
      'SPACE/MOUSE  Fire weapon',
      '1-9, 0, -    Select weapon',
      'SCROLL       Cycle weapons',
    ];
    for (const line of p1Controls) {
      this.ctx.fillText(line, 10 * cellWidth, y * cellHeight);
      y++;
    }

    // Player 2 section
    y += 1;
    this.ctx.fillStyle = '#00ffff';
    this.ctx.fillText('═══ PLAYER 2 (RIGHT) ═══', 10 * cellWidth, y * cellHeight);
    y += 2;

    this.ctx.fillStyle = '#ffffff';
    const p2Controls = [
      '↑/↓          Forward/Back',
      '←/→          Turn left/right',
      ',/.          Strafe',
      'ENTER        Fire weapon',
      'F1-F11       Select weapon',
    ];
    for (const line of p2Controls) {
      this.ctx.fillText(line, 10 * cellWidth, y * cellHeight);
      y++;
    }

    // Weapons section
    y = 7;
    const weaponsX = 55;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText('═══ WEAPONS ═══', weaponsX * cellWidth, y * cellHeight);
    y += 2;

    this.ctx.fillStyle = '#ffffff';
    const weapons = [
      '1  Fist          No ammo',
      '2  Knife         No ammo, fast',
      '3  Hammer        No ammo, strong',
      '4  Axe           No ammo, medium',
      '5  Pistol        Bullets (•)',
      '6  Shotgun       Shells (▪)',
      '7  Chaingun      Bullets (•)',
      '8  Rocket        Rockets (◆)',
      '9  Plasma        Cells (●)',
      '0  BFG 9000      Cells (●)',
      '-  Flamethrower  Fuel (▲)',
    ];
    for (const line of weapons) {
      this.ctx.fillText(line, weaponsX * cellWidth, y * cellHeight);
      y++;
    }

    // Enemies section
    y += 1;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText('═══ ENEMIES ═══', weaponsX * cellWidth, y * cellHeight);
    y += 2;

    const enemies = [
      { name: 'Imp', colour: '#ff6600', desc: 'Fast, weak melee' },
      { name: 'Demon', colour: '#cc3366', desc: 'Slow, strong melee' },
      { name: 'Cacodemon', colour: '#ff0000', desc: 'Flying, shoots lightning' },
      { name: 'Baron', colour: '#44ff44', desc: 'Tough, melee + fireballs' },
      { name: 'Cyberdemon', colour: '#888899', desc: 'BOSS! Rockets + summons' },
    ];
    for (const enemy of enemies) {
      this.ctx.fillStyle = enemy.colour;
      this.ctx.fillText(enemy.name.padEnd(12), weaponsX * cellWidth, y * cellHeight);
      this.ctx.fillStyle = '#888888';
      this.ctx.fillText(enemy.desc, (weaponsX + 12) * cellWidth, y * cellHeight);
      y++;
    }

    // Pickups section
    y = 22;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText('═══ PICKUPS ═══', 10 * cellWidth, y * cellHeight);
    y += 2;

    const pickups = [
      { char: '+', colour: '#00ff00', desc: 'Health (+25 HP)' },
      { char: '█', colour: '#0066ff', desc: 'Armor (+25 AR)' },
      { char: '█', colour: '#ffcc00', desc: 'Bullets' },
      { char: '█', colour: '#ff8800', desc: 'Shells' },
      { char: '█', colour: '#ff4400', desc: 'Rockets' },
      { char: '█', colour: '#00ffff', desc: 'Cells' },
      { char: '█', colour: '#ff6600', desc: 'Fuel' },
    ];

    let px = 10;
    for (const pickup of pickups) {
      this.ctx.fillStyle = pickup.colour;
      this.ctx.fillText(pickup.char, px * cellWidth, y * cellHeight);
      this.ctx.fillStyle = '#888888';
      this.ctx.fillText(pickup.desc, (px + 2) * cellWidth, y * cellHeight);
      px += 14;
      if (px > 80) {
        px = 10;
        y++;
      }
    }

    // Other controls
    y = 28;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillText('═══ OTHER ═══', 10 * cellWidth, y * cellHeight);
    y += 2;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('R            Restart (when dead)', 10 * cellWidth, y * cellHeight);
    y++;
    this.ctx.fillText('H            Toggle this help', 10 * cellWidth, y * cellHeight);

    // Tips
    y += 3;
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillText('═══ TIPS ═══', 10 * cellWidth, y * cellHeight);
    y += 2;

    this.ctx.fillStyle = '#aaaaaa';
    const tips = [
      '• Keep moving! Standing still makes you an easy target.',
      '• Use the shotgun for close combat, chaingun for sustained fire.',
      '• The flamethrower is devastating at short range.',
      '• Watch your ammo - fist always works but does low damage.',
      '• Pick up health and armor to survive longer.',
    ];
    for (const tip of tips) {
      this.ctx.fillText(tip, 10 * cellWidth, y * cellHeight);
      y++;
    }

    // Press any key prompt
    y = screenHeight - 4;
    this.ctx.fillStyle = '#ffff00';
    const prompt = '>>> Press H or SPACE to start playing <<<';
    this.ctx.fillText(prompt, (screenWidth * cellWidth - prompt.length * cellWidth) / 2, y * cellHeight);
  }

  /** Draw health bar above a sprite (only shows when damaged) */
  drawSpriteHealthBar(
    screenX: number,
    screenY: number,
    spriteWidth: number,
    currentHealth: number,
    maxHealth: number,
    distance: number
  ): void {
    // Only show health bar if enemy is damaged
    if (currentHealth >= maxHealth) return;
    // Don't show for dead enemies
    if (currentHealth <= 0) return;
    // Don't show if too far away
    if (distance > 8) return;

    const { cellWidth, cellHeight } = this.config;
    const healthPercent = currentHealth / maxHealth;
    const barWidth = Math.min(8, Math.max(3, Math.floor(spriteWidth / 3)));
    const barX = screenX - Math.floor(barWidth / 2);
    const barY = screenY - 2;

    if (barY < 0) return;

    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(barX * cellWidth, barY * cellHeight, barWidth * cellWidth, cellHeight * 0.6);

    // Health bar (red to green)
    const r = Math.floor(255 * (1 - healthPercent));
    const g = Math.floor(255 * healthPercent);
    this.ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
    this.ctx.fillRect(
      barX * cellWidth,
      barY * cellHeight,
      barWidth * cellWidth * healthPercent,
      cellHeight * 0.6
    );
  }

  /** Draw username entry screen */
  drawUsernameEntry(currentInput: string): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Dark background with stars
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Animated starfield
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = ((i * 137 + Math.floor(this.animTime * 20)) % screenWidth);
      const y = ((i * 89) % screenHeight);
      const char = i % 3 === 0 ? '★' : '·';
      this.ctx.fillStyle = i % 5 === 0 ? '#ffffff' : '#666688';
      this.ctx.fillText(char, x * cellWidth, y * cellHeight);
    }

    // Title
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = `${cellHeight * 3}px monospace`;
    const title = 'TEXT DOOM';
    const titleWidth = title.length * cellWidth * 1.8;
    this.ctx.fillText(title, (screenWidth * cellWidth - titleWidth) / 2, 12 * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    // Welcome message
    this.ctx.fillStyle = '#ffffff';
    const welcome = 'Welcome, warrior!';
    this.ctx.fillText(welcome, (screenWidth * cellWidth - welcome.length * cellWidth) / 2, 20 * cellHeight);

    // Prompt
    this.ctx.fillStyle = '#ffff00';
    const prompt = 'Enter your name:';
    this.ctx.fillText(prompt, (screenWidth * cellWidth - prompt.length * cellWidth) / 2, 26 * cellHeight);

    // Input box
    const boxWidth = 16;
    const boxX = (screenWidth / 2 - boxWidth / 2) * cellWidth;
    const boxY = 29 * cellHeight;

    this.ctx.fillStyle = '#333366';
    this.ctx.fillRect(boxX, boxY, boxWidth * cellWidth, 3 * cellHeight);
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxWidth * cellWidth, 3 * cellHeight);

    // Current input with cursor
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = `${cellHeight * 1.5}px monospace`;
    const displayText = currentInput + (Math.floor(this.animTime * 2) % 2 === 0 ? '_' : ' ');
    const textX = boxX + cellWidth;
    this.ctx.fillText(displayText, textX, boxY + cellHeight * 2);

    this.ctx.font = `${cellHeight}px monospace`;

    // Instructions
    this.ctx.fillStyle = '#888888';
    const instructions = 'Type your name (max 12 characters)';
    this.ctx.fillText(instructions, (screenWidth * cellWidth - instructions.length * cellWidth) / 2, 36 * cellHeight);

    this.ctx.fillStyle = currentInput.length >= 1 ? '#00ff00' : '#666666';
    const enterHint = currentInput.length >= 1 ? 'Press ENTER to continue' : 'Enter at least 1 character';
    this.ctx.fillText(enterHint, (screenWidth * cellWidth - enterHint.length * cellWidth) / 2, 40 * cellHeight);
  }

  /** Draw shop/armoury screen */
  drawShop(shopState: ShopState, selectedWeapon: number): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Dark background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Animated background (subtle)
    for (let i = 0; i < 30; i++) {
      const x = ((i * 137 + Math.floor(this.animTime * 10)) % screenWidth);
      const y = ((i * 89) % screenHeight);
      this.ctx.fillStyle = '#111122';
      this.ctx.fillText('·', x * cellWidth, y * cellHeight);
    }

    // Title
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.font = `${cellHeight * 2.5}px monospace`;
    const title = 'ARMOURY';
    const titleWidth = title.length * cellWidth * 1.5;
    this.ctx.fillText(title, (screenWidth * cellWidth - titleWidth) / 2, 6 * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    // Credit balance
    this.ctx.fillStyle = '#ffdd00';
    const creditsText = `Credits: ${shopState.credits} ¤`;
    this.ctx.fillText(creditsText, (screenWidth * cellWidth - creditsText.length * cellWidth) / 2, 10 * cellHeight);

    // Weapon lists - melee on left, ranged on right
    const meleeWeapons: WeaponType[] = ['fist', 'knife', 'hammer', 'axe'];
    const rangedWeapons: WeaponType[] = ['pistol', 'shotgun', 'chaingun', 'rocket', 'plasma', 'bfg', 'flamethrower'];

    const leftX = 25;
    const rightX = 110;
    const startY = 14;

    // Column headers
    this.ctx.fillStyle = '#888888';
    this.ctx.fillText('MELEE', leftX * cellWidth, startY * cellHeight);
    this.ctx.fillText('RANGED', rightX * cellWidth, startY * cellHeight);

    // Key mappings for weapons
    const keyMap: Record<WeaponType, string> = {
      fist: '1',
      knife: '2',
      hammer: '3',
      axe: '4',
      pistol: '5',
      shotgun: '6',
      chaingun: '7',
      rocket: '8',
      plasma: '9',
      bfg: '0',
      flamethrower: '-',
    };

    // Draw melee weapons
    for (let i = 0; i < meleeWeapons.length; i++) {
      const weapon = meleeWeapons[i];
      const y = startY + 2 + i * 3;
      const isSelected = selectedWeapon === i;
      this.drawWeaponUpgradeEntry(weapon, keyMap[weapon], leftX, y, isSelected, shopState);
    }

    // Draw ranged weapons
    for (let i = 0; i < rangedWeapons.length; i++) {
      const weapon = rangedWeapons[i];
      const y = startY + 2 + i * 3;
      const isSelected = selectedWeapon === meleeWeapons.length + i;
      this.drawWeaponUpgradeEntry(weapon, keyMap[weapon], rightX, y, isSelected, shopState);
    }

    // Instructions
    this.ctx.fillStyle = '#666666';
    const instructions = 'Press 1-9, 0, - to upgrade | ESC to exit';
    this.ctx.fillText(instructions, (screenWidth * cellWidth - instructions.length * cellWidth) / 2, (screenHeight - 4) * cellHeight);
  }

  /** Draw a single weapon upgrade entry in the shop */
  private drawWeaponUpgradeEntry(
    weapon: WeaponType,
    key: string,
    x: number,
    y: number,
    isSelected: boolean,
    shopState: ShopState
  ): void {
    const { cellWidth, cellHeight } = this.config;
    const level = shopState.upgrades[weapon] ?? 0;
    const cost = getUpgradeCost(weapon);
    const canAfford = cost !== null && shopState.credits >= cost;
    const isMaxed = level >= MAX_UPGRADE_LEVEL;

    // Get base and current damage
    const stats = getWeaponStats(weapon);
    const baseDamage = stats.damage;
    const currentDamage = Math.floor(baseDamage * (1 + level * 0.1));
    const nextDamage = !isMaxed ? Math.floor(baseDamage * (1 + (level + 1) * 0.1)) : currentDamage;

    // Selection indicator
    if (isSelected) {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillText('>', (x - 2) * cellWidth, y * cellHeight);
    }

    // Key number
    this.ctx.fillStyle = '#888888';
    this.ctx.fillText(`${key}.`, x * cellWidth, y * cellHeight);

    // Weapon name
    this.ctx.fillStyle = isSelected ? '#ffffff' : '#aaaaaa';
    const name = weapon.toUpperCase().padEnd(12);
    this.ctx.fillText(name, (x + 3) * cellWidth, y * cellHeight);

    // Level indicator
    const levelText = `Lv ${level}/${MAX_UPGRADE_LEVEL}`;
    this.ctx.fillStyle = level > 0 ? '#00ff00' : '#666666';
    this.ctx.fillText(levelText, (x + 16) * cellWidth, y * cellHeight);

    // Cost or MAXED
    if (isMaxed) {
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillText('[MAXED]', (x + 3) * cellWidth, (y + 1) * cellHeight);
    } else {
      this.ctx.fillStyle = canAfford ? '#ffdd00' : '#884400';
      this.ctx.fillText(`[${cost}¤]`, (x + 3) * cellWidth, (y + 1) * cellHeight);
    }

    // Damage info
    this.ctx.fillStyle = '#666666';
    if (isMaxed) {
      this.ctx.fillText(`Dmg: ${currentDamage}`, (x + 12) * cellWidth, (y + 1) * cellHeight);
    } else {
      this.ctx.fillText(`Dmg: ${currentDamage} → ${nextDamage}`, (x + 12) * cellWidth, (y + 1) * cellHeight);
    }
  }

  /** Draw pause screen overlay */
  drawPauseScreen(): void {
    const { screenWidth, screenHeight, cellWidth, cellHeight } = this.config;

    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, screenWidth * cellWidth, screenHeight * cellHeight);

    // Pause title
    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = `${cellHeight * 3}px monospace`;
    const title = 'PAUSED';
    const titleWidth = title.length * cellWidth * 1.8;
    this.ctx.fillText(title, (screenWidth * cellWidth - titleWidth) / 2, (screenHeight / 2 - 5) * cellHeight);

    this.ctx.font = `${cellHeight}px monospace`;

    // Instructions
    this.ctx.fillStyle = '#ffffff';
    const instructions = [
      'Press P or ESC to resume',
      '',
      'WASD - Move',
      'Mouse/Space - Fire',
      '1-8 - Switch weapon',
      'H - Help',
    ];

    const startY = screenHeight / 2;
    for (let i = 0; i < instructions.length; i++) {
      const text = instructions[i];
      const textWidth = text.length * cellWidth;
      this.ctx.fillText(text, (screenWidth * cellWidth - textWidth) / 2, (startY + i * 2) * cellHeight);
    }

    // Quit hint
    this.ctx.fillStyle = '#666666';
    const quitHint = 'Press ESC twice to quit to menu';
    const quitWidth = quitHint.length * cellWidth;
    this.ctx.fillText(quitHint, (screenWidth * cellWidth - quitWidth) / 2, (screenHeight - 5) * cellHeight);
  }

  /** Get z-buffer for sprite rendering */
  getZBuffer(): number[] {
    return this.zBuffer;
  }

  /** Get canvas dimensions */
  getSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /** Darken a hex colour */
  private darkenColour(hex: string, factor: number): string {
    // Parse hex
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Apply factor
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    // Return new hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}
