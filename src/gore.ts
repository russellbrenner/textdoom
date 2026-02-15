import type { GoreParticle, BloodDecal, Vec2, GameConfig } from './types';

// Particle characters by type
const PARTICLE_CHARS = {
  blood: ['*', '•', '▪', '●'],
  gib: ['█', '▓', '▒', '◘'],
  spark: ['+', '×', '✦', '*'],
  plasma: ['◆', '●', '○', '◇'],
  flame: ['▲', '▼', '◆', '█', '▓', '░'],
};

// Particle colours by type
const PARTICLE_COLOURS = {
  blood: ['#ff0000', '#cc0000', '#880000', '#660000'],
  gib: ['#aa3333', '#993333', '#774444', '#663333'],
  spark: ['#ffff00', '#ffcc00', '#ffffff', '#ff8800'],
  plasma: ['#00ffff', '#0088ff', '#00ccff', '#44ffff'],
  flame: ['#ff6600', '#ff4400', '#ffcc00', '#ff8800', '#ff2200', '#ffff00'],
};

const MAX_PARTICLES = 200;
const MAX_DECALS = 100;
const DECAL_LIFETIME = 60; // Seconds before decals fade

/**
 * Gore particle and decal manager
 */
export class GoreManager {
  private particles: GoreParticle[] = [];
  private decals: BloodDecal[] = [];

  constructor(_config: GameConfig) {
    // Config reserved for future use (e.g., particle density based on screen size)
  }

  /**
   * Spawn blood particles when an enemy is hit
   */
  spawnHitGore(pos: Vec2, shooterPos: Vec2, damage: number): void {
    // Direction away from shooter
    const dx = pos.x - shooterPos.x;
    const dy = pos.y - shooterPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;

    // More particles for more damage
    const particleCount = Math.min(15, Math.floor(5 + damage / 10));

    for (let i = 0; i < particleCount; i++) {
      this.spawnParticle(pos, 'blood', dirX, dirY, 1.5);
    }
  }

  /**
   * Spawn gore when an enemy is killed
   */
  spawnKillGore(pos: Vec2, shooterPos: Vec2, overkill: boolean): void {
    // Direction away from shooter
    const dx = pos.x - shooterPos.x;
    const dy = pos.y - shooterPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;

    // Blood particles
    const bloodCount = overkill ? 40 : 25;
    for (let i = 0; i < bloodCount; i++) {
      this.spawnParticle(pos, 'blood', dirX, dirY, overkill ? 3 : 2);
    }

    // Gibs for overkill
    const gibCount = overkill ? 10 : 4;
    for (let i = 0; i < gibCount; i++) {
      this.spawnParticle(pos, 'gib', dirX, dirY, overkill ? 2.5 : 1.5);
    }

    // Blood pool decal
    this.spawnDecal(pos, overkill ? 3 : 2);
  }

  /**
   * Spawn spark particles (for hitting walls, etc.)
   */
  spawnSparks(pos: Vec2, dirX: number, dirY: number): void {
    for (let i = 0; i < 8; i++) {
      this.spawnParticle(pos, 'spark', -dirX, -dirY, 1);
    }
  }

  /**
   * Spawn plasma effect particles
   */
  spawnPlasmaEffect(pos: Vec2): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.spawnParticle(pos, 'plasma', Math.cos(angle), Math.sin(angle), 1.5);
    }
  }

  /**
   * Spawn flame particles (for flamethrower)
   */
  spawnFlame(pos: Vec2, dirX: number, dirY: number): void {
    // Spawn multiple flame particles in a cone
    for (let i = 0; i < 3; i++) {
      const spread = 0.3;
      const spreadX = dirX + (Math.random() - 0.5) * spread;
      const spreadY = dirY + (Math.random() - 0.5) * spread;
      this.spawnParticle(pos, 'flame', spreadX, spreadY, 4 + Math.random() * 2);
    }
  }

  /**
   * Spawn a single particle
   */
  private spawnParticle(
    pos: Vec2,
    type: GoreParticle['type'],
    dirX: number,
    dirY: number,
    speed: number
  ): void {
    if (this.particles.length >= MAX_PARTICLES) {
      // Remove oldest particle
      this.particles.shift();
    }

    const chars = PARTICLE_CHARS[type];
    const colours = PARTICLE_COLOURS[type];

    // Random spread
    const spread = 0.5;
    const vx = dirX * speed + (Math.random() - 0.5) * spread * speed;
    const vy = dirY * speed + (Math.random() - 0.5) * spread * speed;

    const life = 0.5 + Math.random() * 1.0;

    this.particles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: vx, y: vy },
      char: chars[Math.floor(Math.random() * chars.length)],
      colour: colours[Math.floor(Math.random() * colours.length)],
      life,
      maxLife: life,
      type,
    });
  }

  /**
   * Spawn a blood decal on the floor
   */
  private spawnDecal(pos: Vec2, size: number): void {
    if (this.decals.length >= MAX_DECALS) {
      // Remove oldest decal
      this.decals.shift();
    }

    this.decals.push({
      x: pos.x,
      y: pos.y,
      size: Math.min(3, Math.max(1, Math.floor(size))),
      age: 0,
    });
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply gravity (except plasma and flame which float/rise)
      if (p.type === 'flame') {
        // Flames rise slightly and spread
        p.vel.y -= deltaTime * 0.5;
      } else if (p.type !== 'plasma') {
        p.vel.y += deltaTime * 3; // Gravity
      }

      // Apply velocity
      p.pos.x += p.vel.x * deltaTime;
      p.pos.y += p.vel.y * deltaTime;

      // Decay
      p.life -= deltaTime;

      // Friction
      p.vel.x *= 0.98;
      p.vel.y *= 0.98;

      // Remove dead particles
      if (p.life <= 0) {
        // Blood/gib particles may create decals when they die
        if ((p.type === 'blood' || p.type === 'gib') && Math.random() < 0.2) {
          this.spawnDecal(p.pos, 1);
        }
        this.particles.splice(i, 1);
      }
    }

    // Age decals
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].age += deltaTime;
      if (this.decals[i].age > DECAL_LIFETIME) {
        this.decals.splice(i, 1);
      }
    }
  }

  /**
   * Get all active particles for rendering
   */
  getParticles(): GoreParticle[] {
    return this.particles;
  }

  /**
   * Get all decals for rendering
   */
  getDecals(): BloodDecal[] {
    return this.decals;
  }

  /**
   * Clear all particles and decals
   */
  clear(): void {
    this.particles = [];
    this.decals = [];
  }

  /**
   * Get particle count for debugging
   */
  getParticleCount(): number {
    return this.particles.length;
  }
}
