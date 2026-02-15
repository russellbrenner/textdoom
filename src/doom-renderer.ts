/**
 * Doom-style game renderer using WebGL 3D ASCII
 * Integrates WebGL renderer with game state
 */

import { WebGLRenderer, hexToRGBA, type PostProcessSettings } from './webgl-renderer';
import { getDoomFace, DOOM_WEAPONS, DOOM_ENEMIES, BIG_NUMBERS, type EnemySprite } from './doom-assets';
import type { GameConfig, Player, WeaponState, Vec2 } from './types';

// Particle system
interface Particle3D {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  char: string;
  color: [number, number, number, number];
  life: number;
  maxLife: number;
  scale: number;
  glow: number;
  gravity: number;
}

/**
 * Doom-style renderer that uses WebGL for 3D ASCII
 */
export class DoomRenderer {
  private webgl: WebGLRenderer;
  public config: GameConfig;

  // Animation state
  private time: number = 0;
  private weaponBob: number = 0;
  private weaponRaise: number = 1; // 0 = lowered, 1 = raised

  // Particles
  private particles: Particle3D[] = [];
  private maxParticles = 1000;

  // Face state
  private faceState: 'idle' | 'hurt_left' | 'hurt_right' | 'grin' = 'idle';
  private faceTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.config = config;

    // Set canvas size
    canvas.width = config.screenWidth * config.cellWidth;
    canvas.height = config.screenHeight * config.cellHeight;

    // Initialize WebGL renderer
    this.webgl = new WebGLRenderer(canvas, config);
  }

  /** Update animation time */
  update(deltaTime: number): void {
    this.time += deltaTime;
    this.webgl.updateTime(deltaTime);

    // Update face timer
    if (this.faceTimer > 0) {
      this.faceTimer -= deltaTime;
      if (this.faceTimer <= 0) {
        this.faceState = 'idle';
      }
    }

    // Update particles
    this.updateParticles(deltaTime);
  }

  /** Set split screen mode */
  setSplitScreen(_enabled: boolean): void {
    // TODO: Implement split screen for WebGL
  }

  /** Set current viewport for split screen */
  setViewport(_viewport: 1 | 2): void {
    // TODO: Implement viewport switching for WebGL
  }

  /** Begin frame */
  beginFrame(): void {
    this.webgl.clearInstances();
  }

  /** End frame and render */
  endFrame(): void {
    this.webgl.render();
  }

  /** Set camera from player */
  setCamera(player: Player): void {
    this.webgl.setCamera(player.pos, player.dir);
  }

  /** Trigger damage flash */
  setDamageFlash(intensity: number, fromLeft: boolean): void {
    this.webgl.setPostProcess({
      damageFlash: [intensity, 0, 0],
    });
    this.faceState = fromLeft ? 'hurt_left' : 'hurt_right';
    this.faceTimer = 0.5;
  }

  /** Trigger kill grin */
  setKillGrin(): void {
    this.faceState = 'grin';
    this.faceTimer = 1.0;
  }

  /** Set screen shake */
  setScreenShake(intensity: number): void {
    this.webgl.setPostProcess({ screenShake: intensity });
  }

  /** Update post-processing */
  setPostProcess(settings: Partial<PostProcessSettings>): void {
    this.webgl.setPostProcess(settings);
  }

  // ============================================================================
  // WALL RENDERING
  // ============================================================================

  /** Draw walls from raycasting data */
  drawWalls(rays: Array<{ perpWallDist: number; side: number; wallType: number; wallX: number }>): void {
    const { screenWidth, screenHeight } = this.config;
    const halfHeight = screenHeight / 2;

    for (let x = 0; x < rays.length && x < screenWidth; x++) {
      const ray = rays[x];
      const lineHeight = Math.floor(screenHeight / ray.perpWallDist);
      const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + halfHeight));
      const drawEnd = Math.min(screenHeight - 1, Math.floor(lineHeight / 2 + halfHeight));

      // Calculate 3D position for this column
      const screenX = (x / screenWidth - 0.5) * 2;

      // Sample wall texture
      const { char, color } = this.sampleWallTexture(ray.wallType, ray.wallX, ray.side);

      // Distance-based shading
      const shade = Math.max(0.2, 1 - ray.perpWallDist / 15);
      const rgba = hexToRGBA(color);
      rgba[0] *= shade;
      rgba[1] *= shade;
      rgba[2] *= shade;

      // Add wall characters as 3D instances
      const worldX = ray.perpWallDist * 0.5; // Depth
      for (let y = drawStart; y < drawEnd; y += 2) {
        const screenY = (y / screenHeight - 0.5) * -2;
        this.webgl.addChar({
          x: screenX * 5 + worldX * 0.1,
          y: screenY * 3,
          z: worldX,
          char,
          color: rgba,
          scale: 0.15,
          glow: 0,
          rotation: 0,
        });
      }
    }
  }

  private sampleWallTexture(wallType: number, wallX: number, side: number): { char: string; color: string } {
    const patterns: Record<number, { chars: string; color: string }> = {
      1: { chars: '█▓▒░', color: '#666666' }, // Gray stone
      2: { chars: '▓▒░ ', color: '#884422' }, // Brown wood
      3: { chars: '█▓▒░', color: '#aa4444' }, // Red brick
      4: { chars: '═║╬╠', color: '#4488aa' }, // Tech blue
      5: { chars: '▓▒░█', color: '#448844' }, // Green slime
    };

    const pattern = patterns[wallType] || patterns[1];
    const charIndex = Math.floor(wallX * pattern.chars.length) % pattern.chars.length;
    let color = pattern.color;

    // Darken one side for depth
    if (side === 1) {
      const r = parseInt(color.slice(1, 3), 16) * 0.7;
      const g = parseInt(color.slice(3, 5), 16) * 0.7;
      const b = parseInt(color.slice(5, 7), 16) * 0.7;
      color = `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
    }

    return { char: pattern.chars[charIndex], color };
  }

  // ============================================================================
  // FLOOR AND CEILING
  // ============================================================================

  /** Draw textured floor and ceiling */
  drawFloorCeiling(_player: Player): void {
    // Floor and ceiling are rendered as a gradient of characters
    // in the background layer
    const { screenWidth, screenHeight } = this.config;

    for (let y = screenHeight / 2; y < screenHeight; y += 3) {
      const rowDistance = screenHeight / (2 * y - screenHeight);
      const shade = Math.max(0.1, 1 - rowDistance / 10);

      for (let x = 0; x < screenWidth; x += 4) {
        const screenX = (x / screenWidth - 0.5) * 2;
        const screenY = (y / screenHeight - 0.5) * -2;

        // Floor
        this.webgl.addChar({
          x: screenX * 10,
          y: screenY * 5,
          z: rowDistance,
          char: '░',
          color: [0.3 * shade, 0.25 * shade, 0.2 * shade, 1],
          scale: 0.2,
          glow: 0,
          rotation: 0,
        });

        // Ceiling
        this.webgl.addChar({
          x: screenX * 10,
          y: -screenY * 5,
          z: rowDistance,
          char: '▒',
          color: [0.2 * shade, 0.2 * shade, 0.3 * shade, 1],
          scale: 0.2,
          glow: 0,
          rotation: 0,
        });
      }
    }
  }

  // ============================================================================
  // SPRITE RENDERING
  // ============================================================================

  /** Draw a sprite (enemy) in 3D space */
  drawSprite(
    worldPos: Vec2,
    distance: number,
    type: string,
    state: string,
    health: number,
    maxHealth: number
  ): void {
    const enemyData = DOOM_ENEMIES[type];
    if (!enemyData) return;

    // Get sprite frame
    const stateKey = state as keyof EnemySprite;
    const lines = enemyData[stateKey] || enemyData.idle;
    if (!Array.isArray(lines)) return;

    const baseColor = hexToRGBA(enemyData.color);
    const glowColor = enemyData.glowColor ? hexToRGBA(enemyData.glowColor) : baseColor;

    // Scale based on distance
    const scale = Math.max(0.05, 0.3 / distance);

    // Health-based damage coloring
    const healthRatio = health / maxHealth;
    if (healthRatio < 0.5) {
      baseColor[0] = Math.min(1, baseColor[0] + (1 - healthRatio) * 0.5);
    }

    // Render each line of the sprite
    for (let row = 0; row < lines.length; row++) {
      const line = lines[row];
      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        if (char === ' ') continue;

        // Check for glowing eyes
        const isEye = char === '◉' || char === '●';
        const color = isEye ? glowColor : baseColor;
        const glow = isEye ? 0.8 : 0;

        this.webgl.addChar({
          x: worldPos.x + (col - line.length / 2) * scale * 0.5,
          y: 0.5 - (row - lines.length / 2) * scale * 0.5,
          z: worldPos.y,
          char,
          color,
          scale,
          glow,
          rotation: 0,
        });
      }
    }
  }

  // ============================================================================
  // WEAPON RENDERING
  // ============================================================================

  /** Draw weapon at bottom of screen */
  drawWeapon(weapon: WeaponState, _player: Player): void {
    const weaponData = DOOM_WEAPONS[weapon.type];
    if (!weaponData) return;

    const lines = weapon.isFiring ? weaponData.firing : weaponData.idle;
    const baseColor = hexToRGBA(weaponData.color);

    // Weapon bob while moving
    const bobX = Math.sin(this.time * 8) * 0.02 * this.weaponBob;
    const bobY = Math.abs(Math.cos(this.time * 8)) * 0.01 * this.weaponBob;

    // Weapon position (screen space, rendered on top)
    const baseX = 0;
    const baseY = -0.6 - (1 - this.weaponRaise) * 0.5;

    // Muzzle flash
    if (weapon.isFiring) {
      const flashColor = hexToRGBA(weaponData.muzzleFlashColor);
      flashColor[3] = 0.8;
      this.webgl.setPostProcess({
        damageFlash: [flashColor[0] * 0.2, flashColor[1] * 0.2, flashColor[2] * 0.1],
      });
    }

    // Render weapon
    const scale = 0.08;
    for (let row = 0; row < lines.length; row++) {
      const line = lines[row];
      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        if (char === ' ') continue;

        // Muzzle flash chars glow
        const isMuzzleFlash = weapon.isFiring && (char === '╲' || char === '╱' || char === '█' || char === '◆');
        const color = isMuzzleFlash ? hexToRGBA(weaponData.muzzleFlashColor) : [...baseColor] as [number, number, number, number];
        const glow = isMuzzleFlash ? 1 : 0;

        this.webgl.addChar({
          x: baseX + bobX + (col - line.length / 2) * scale * 0.6,
          y: baseY + bobY - row * scale * 0.8,
          z: 0.1, // Close to camera
          char,
          color,
          scale: scale * 1.5,
          glow,
          rotation: 0,
        });
      }
    }
  }

  /** Update weapon bob based on movement */
  setWeaponBob(moving: boolean): void {
    this.weaponBob = moving ? Math.min(1, this.weaponBob + 0.1) : Math.max(0, this.weaponBob - 0.05);
  }

  // ============================================================================
  // HUD RENDERING
  // ============================================================================

  /** Draw the Doom-style HUD */
  drawHUD(player: Player, weapon: WeaponState, killCount: number = 0): void {
    // HUD is rendered in screen space (z = 0, very close)
    const hudY = -0.85;
    const hudZ = 0.05;
    const hudScale = 0.04;

    // Background bar
    for (let x = -1; x <= 1; x += 0.02) {
      this.webgl.addChar({
        x,
        y: hudY,
        z: hudZ,
        char: '▀',
        color: [0.2, 0.2, 0.2, 0.9],
        scale: hudScale,
        glow: 0,
        rotation: 0,
      });
    }

    // Health (left side)
    this.drawBigNumber(player.health, -0.8, hudY + 0.05, hudZ, '#ff4444', hudScale * 0.8);
    this.drawSmallText('HEALTH', -0.85, hudY + 0.12, hudZ, '#888888', hudScale * 0.5);

    // Armor (left-center)
    this.drawBigNumber(player.armor, -0.4, hudY + 0.05, hudZ, '#4444ff', hudScale * 0.8);
    this.drawSmallText('ARMOR', -0.45, hudY + 0.12, hudZ, '#888888', hudScale * 0.5);

    // Doom-guy face (center)
    this.drawDoomFace(player.health, 0, hudY + 0.08, hudZ, hudScale * 0.6);

    // Ammo (right-center)
    const ammo = this.getAmmoForWeapon(player, weapon.type);
    this.drawBigNumber(ammo, 0.4, hudY + 0.05, hudZ, '#ffff00', hudScale * 0.8);
    this.drawSmallText('AMMO', 0.35, hudY + 0.12, hudZ, '#888888', hudScale * 0.5);

    // Kills (right side)
    this.drawBigNumber(killCount, 0.8, hudY + 0.05, hudZ, '#00ff00', hudScale * 0.8);
    this.drawSmallText('KILLS', 0.75, hudY + 0.12, hudZ, '#888888', hudScale * 0.5);

    // Weapon name
    this.drawSmallText(weapon.type.toUpperCase(), 0, hudY - 0.02, hudZ, '#ffffff', hudScale * 0.4);
  }

  private drawBigNumber(value: number, x: number, y: number, z: number, color: string, scale: number): void {
    const str = Math.max(0, Math.floor(value)).toString().padStart(3, ' ');
    const rgba = hexToRGBA(color);

    for (let i = 0; i < str.length; i++) {
      const digit = str[i];
      if (digit === ' ') continue;

      const numLines = BIG_NUMBERS[digit];
      if (!numLines) continue;

      for (let row = 0; row < numLines.length; row++) {
        const line = numLines[row];
        for (let col = 0; col < line.length; col++) {
          if (line[col] === ' ') continue;

          this.webgl.addChar({
            x: x + i * scale * 4 + col * scale * 0.6,
            y: y - row * scale * 0.8,
            z,
            char: '█',
            color: rgba,
            scale: scale * 0.8,
            glow: 0.2,
            rotation: 0,
          });
        }
      }
    }
  }

  private drawSmallText(text: string, x: number, y: number, z: number, color: string, scale: number): void {
    const rgba = hexToRGBA(color);
    for (let i = 0; i < text.length; i++) {
      this.webgl.addChar({
        x: x + i * scale * 0.6,
        y,
        z,
        char: text[i],
        color: rgba,
        scale,
        glow: 0,
        rotation: 0,
      });
    }
  }

  private drawDoomFace(health: number, x: number, y: number, z: number, scale: number): void {
    const { lines, color } = getDoomFace(health, this.faceState, false);
    const rgba = hexToRGBA(color);

    for (let row = 0; row < lines.length; row++) {
      const line = lines[row];
      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        if (char === ' ') continue;

        // Special coloring for eyes and blood
        let charColor = rgba;
        let glow = 0;
        if (char === '◉' || char === '██') {
          charColor = [1, 1, 1, 1];
        } else if (char === '▓' || char === '▒' || char === '░') {
          charColor = [0.8, 0.2, 0.2, 1]; // Blood
        } else if (char === 'X' || char === '><') {
          charColor = [0.2, 0.2, 0.2, 1]; // Closed eyes
        }

        this.webgl.addChar({
          x: x + (col - line.length / 2) * scale * 0.4,
          y: y - row * scale * 0.6,
          z,
          char,
          color: charColor,
          scale: scale * 0.8,
          glow,
          rotation: 0,
        });
      }
    }
  }

  private getAmmoForWeapon(player: Player, weaponType: string): number {
    switch (weaponType) {
      case 'pistol':
      case 'chaingun':
        return player.ammo.bullets;
      case 'shotgun':
        return player.ammo.shells;
      case 'rocket':
        return player.ammo.rockets;
      case 'plasma':
      case 'bfg':
        return player.ammo.cells;
      case 'fist':
        return 999; // Infinite
      default:
        return 0;
    }
  }

  // ============================================================================
  // PARTICLE SYSTEM
  // ============================================================================

  /** Spawn blood particles */
  spawnBlood(pos: Vec2, count: number = 10): void {
    const bloodChars = ['*', '•', '▪', '●', '▓'];
    const bloodColors: Array<[number, number, number, number]> = [
      [1, 0, 0, 1],
      [0.8, 0, 0, 1],
      [0.6, 0, 0, 1],
      [0.4, 0, 0, 1],
    ];

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        pos: { x: pos.x, y: 0.5, z: pos.y },
        vel: {
          x: (Math.random() - 0.5) * 2,
          y: Math.random() * 3,
          z: (Math.random() - 0.5) * 2,
        },
        char: bloodChars[Math.floor(Math.random() * bloodChars.length)],
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
        life: 1 + Math.random(),
        maxLife: 1 + Math.random(),
        scale: 0.05 + Math.random() * 0.05,
        glow: 0,
        gravity: 5,
      });
    }
  }

  /** Spawn explosion particles */
  spawnExplosion(pos: Vec2, count: number = 30): void {
    const explosionChars = ['█', '▓', '▒', '░', '◆', '*'];
    const fireColors: Array<[number, number, number, number]> = [
      [1, 1, 0.5, 1],    // Yellow
      [1, 0.7, 0.2, 1],  // Orange
      [1, 0.4, 0.1, 1],  // Red-orange
      [1, 0.2, 0, 1],    // Red
      [0.3, 0.3, 0.3, 1], // Smoke
    ];

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;

      this.particles.push({
        pos: { x: pos.x, y: 0.5, z: pos.y },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.random() * 4,
          z: Math.sin(angle) * speed,
        },
        char: explosionChars[Math.floor(Math.random() * explosionChars.length)],
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        scale: 0.1 + Math.random() * 0.1,
        glow: 0.8,
        gravity: 2,
      });
    }

    // Screen shake
    this.setScreenShake(0.5);
  }

  /** Spawn plasma particles */
  spawnPlasma(pos: Vec2, dir: Vec2): void {
    const plasmaChars = ['◆', '●', '○', '◇'];

    for (let i = 0; i < 5 && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        pos: { x: pos.x, y: 0.5, z: pos.y },
        vel: {
          x: dir.x * 10 + (Math.random() - 0.5),
          y: (Math.random() - 0.5),
          z: dir.y * 10 + (Math.random() - 0.5),
        },
        char: plasmaChars[Math.floor(Math.random() * plasmaChars.length)],
        color: [0, 1, 1, 1],
        life: 0.3,
        maxLife: 0.3,
        scale: 0.08,
        glow: 1,
        gravity: 0,
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.pos.x += p.vel.x * deltaTime;
      p.pos.y += p.vel.y * deltaTime;
      p.pos.z += p.vel.z * deltaTime;

      // Apply gravity
      p.vel.y -= p.gravity * deltaTime;

      // Floor collision
      if (p.pos.y < 0) {
        p.pos.y = 0;
        p.vel.y *= -0.3;
        p.vel.x *= 0.8;
        p.vel.z *= 0.8;
      }

      // Update life
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Render all particles */
  drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const color: [number, number, number, number] = [
        p.color[0],
        p.color[1],
        p.color[2],
        p.color[3] * alpha,
      ];

      this.webgl.addChar({
        x: p.pos.x,
        y: p.pos.y,
        z: p.pos.z,
        char: p.char,
        color,
        scale: p.scale * (0.5 + alpha * 0.5),
        glow: p.glow * alpha,
        rotation: 0,
      });
    }
  }

  // ============================================================================
  // MENU RENDERING
  // ============================================================================

  /** Draw main menu */
  drawMainMenu(selectedOption: number, _leaderboard?: any): void {
    this.beginFrame();

    // Animated starfield background
    for (let i = 0; i < 100; i++) {
      const x = ((i * 137 + this.time * 20) % 200) / 100 - 1;
      const y = ((i * 89) % 100) / 50 - 1;
      const z = 5 + (i % 5);

      this.webgl.addChar({
        x,
        y,
        z,
        char: i % 3 === 0 ? '★' : '·',
        color: i % 5 === 0 ? [1, 1, 1, 0.8] : [0.4, 0.4, 0.6, 0.5],
        scale: 0.05,
        glow: i % 3 === 0 ? 0.5 : 0,
        rotation: 0,
      });
    }

    // Title
    const title = 'TEXT DOOM';
    for (let i = 0; i < title.length; i++) {
      this.webgl.addChar({
        x: (i - title.length / 2) * 0.15,
        y: 0.6,
        z: 1,
        char: title[i],
        color: [1, 0, 0, 1],
        scale: 0.2,
        glow: 0.5 + Math.sin(this.time * 3 + i * 0.5) * 0.3,
        rotation: 0,
      });
    }

    // Menu options
    const options = ['1 PLAYER', '2 PLAYERS LOCAL', 'HOST ONLINE', 'JOIN ONLINE'];
    for (let i = 0; i < options.length; i++) {
      const isSelected = i === selectedOption;
      const y = 0.2 - i * 0.15;

      for (let j = 0; j < options[i].length; j++) {
        this.webgl.addChar({
          x: (j - options[i].length / 2) * 0.06,
          y,
          z: 1,
          char: options[i][j],
          color: isSelected ? [1, 1, 0, 1] : [0.5, 0.5, 0.5, 1],
          scale: 0.08,
          glow: isSelected ? 0.3 : 0,
          rotation: 0,
        });
      }

      // Selection arrows
      if (isSelected) {
        this.webgl.addChar({
          x: -0.5,
          y,
          z: 1,
          char: '▶',
          color: [1, 0.3, 0.3, 1],
          scale: 0.08,
          glow: 0.5,
          rotation: 0,
        });
        this.webgl.addChar({
          x: 0.5,
          y,
          z: 1,
          char: '◀',
          color: [1, 0.3, 0.3, 1],
          scale: 0.08,
          glow: 0.5,
          rotation: 0,
        });
      }
    }

    this.endFrame();
  }
}
