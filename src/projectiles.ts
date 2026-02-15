import type { Vec2, Player, GameConfig } from './types';
import { isWall } from './map';
import { SpriteManager } from './sprites';
import { GoreManager } from './gore';

export type ProjectileType = 'fireball' | 'rocket' | 'plasma' | 'lightning' | 'bfg_ball';

interface Projectile {
  pos: Vec2;
  vel: Vec2;
  type: ProjectileType;
  damage: number;
  radius: number;     // Splash damage radius (0 for no splash)
  owner: 'player' | number; // 'player' or sprite ID
  char: string;
  colour: string;
  life: number;       // Max travel time
}

// Projectile visual and behaviour definitions
const PROJECTILE_DEFS: Record<ProjectileType, {
  speed: number;
  char: string;
  colour: string;
  radius: number;
  life: number;
}> = {
  fireball: {
    speed: 8,
    char: '●',
    colour: '#ff6600',
    radius: 0,
    life: 3,
  },
  rocket: {
    speed: 12,
    char: '►',
    colour: '#ff4400',
    radius: 3,
    life: 5,
  },
  plasma: {
    speed: 15,
    char: '◆',
    colour: '#00ffff',
    radius: 0,
    life: 2,
  },
  lightning: {
    speed: 10,
    char: '◇',
    colour: '#ffff00',
    radius: 0,
    life: 2,
  },
  bfg_ball: {
    speed: 6,
    char: '◉',
    colour: '#00ff00',
    radius: 5,
    life: 4,
  },
};

/**
 * Projectile manager - handles all flying projectiles
 */
export class ProjectileManager {
  private projectiles: Projectile[] = [];

  constructor(_config: GameConfig) {
    // Config reserved for future use
  }

  /**
   * Fire a projectile from a position in a direction
   */
  fire(
    type: ProjectileType,
    pos: Vec2,
    dir: Vec2,
    damage: number,
    owner: 'player' | number
  ): void {
    const def = PROJECTILE_DEFS[type];

    // Normalise direction
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    const normDir = len > 0 ? { x: dir.x / len, y: dir.y / len } : { x: 1, y: 0 };

    this.projectiles.push({
      pos: { x: pos.x, y: pos.y },
      vel: { x: normDir.x * def.speed, y: normDir.y * def.speed },
      type,
      damage,
      radius: def.radius,
      owner,
      char: def.char,
      colour: def.colour,
      life: def.life,
    });
  }

  /**
   * Fire a player rocket
   */
  firePlayerRocket(player: Player): void {
    this.fire(
      'rocket',
      { x: player.pos.x, y: player.pos.y },
      { x: player.dir.x, y: player.dir.y },
      100,
      'player'
    );
  }

  /**
   * Fire a player plasma bolt
   */
  firePlayerPlasma(player: Player): void {
    this.fire(
      'plasma',
      { x: player.pos.x, y: player.pos.y },
      { x: player.dir.x, y: player.dir.y },
      25,
      'player'
    );
  }

  /**
   * Fire a player BFG ball
   */
  firePlayerBFG(player: Player): void {
    this.fire(
      'bfg_ball',
      { x: player.pos.x, y: player.pos.y },
      { x: player.dir.x, y: player.dir.y },
      400,
      'player'
    );
  }

  /**
   * Fire an enemy fireball
   */
  fireEnemyFireball(pos: Vec2, target: Vec2, damage: number, ownerId: number): void {
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    this.fire('fireball', pos, { x: dx, y: dy }, damage, ownerId);
  }

  /**
   * Update all projectiles
   */
  update(
    deltaTime: number,
    player: Player,
    spriteManager: SpriteManager,
    goreManager?: GoreManager
  ): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Update position
      proj.pos.x += proj.vel.x * deltaTime;
      proj.pos.y += proj.vel.y * deltaTime;

      // Decrease life
      proj.life -= deltaTime;

      // Check for wall collision
      if (isWall(proj.pos.x, proj.pos.y)) {
        this.handleExplosion(proj, player, spriteManager, goreManager);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check for timeout
      if (proj.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check for player hit (enemy projectiles only)
      if (proj.owner !== 'player') {
        const distToPlayer = this.distance(proj.pos, player.pos);
        if (distToPlayer < 0.5) {
          this.handlePlayerHit(proj, player, goreManager);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Check for enemy hit (player projectiles only)
      if (proj.owner === 'player') {
        for (const sprite of spriteManager.sprites) {
          if (sprite.state === 'dead') continue;
          if (sprite.type === 'health' || sprite.type === 'armor') continue;
          if (!sprite.type.startsWith('ammo_') && sprite.type !== 'corpse' && sprite.type !== 'gib') {
            const distToSprite = this.distance(proj.pos, sprite.pos);
            if (distToSprite < 0.5) {
              this.handleEnemyHit(proj, sprite, player, spriteManager, goreManager);
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Handle explosion on impact
   */
  private handleExplosion(
    proj: Projectile,
    player: Player,
    spriteManager: SpriteManager,
    goreManager?: GoreManager
  ): void {
    // Apply splash damage
    if (proj.radius > 0) {
      if (proj.owner === 'player') {
        // Player projectile - damage enemies
        spriteManager.applySplashDamage(proj.pos, proj.radius, proj.damage * 0.5, player, goreManager);
      } else {
        // Enemy projectile - damage player if in range
        const distToPlayer = this.distance(proj.pos, player.pos);
        if (distToPlayer < proj.radius) {
          const falloff = 1 - (distToPlayer / proj.radius);
          const damage = Math.floor(proj.damage * falloff * 0.5);
          if (damage > 0 && !player.isDead) {
            player.health = Math.max(0, player.health - damage);
            player.damageFlash = 0.5;
            if (player.health <= 0) {
              player.isDead = true;
            }
          }
        }
      }
    }

    // Spawn explosion effect
    if (goreManager) {
      if (proj.type === 'plasma' || proj.type === 'bfg_ball') {
        goreManager.spawnPlasmaEffect(proj.pos);
      } else {
        goreManager.spawnSparks(proj.pos, proj.vel.x, proj.vel.y);
      }
    }

    // Screen shake for rockets and BFG
    if (proj.type === 'rocket') {
      player.screenShake = Math.max(player.screenShake, 0.3);
    } else if (proj.type === 'bfg_ball') {
      player.screenShake = Math.max(player.screenShake, 0.8);
    }
  }

  /**
   * Handle player getting hit by projectile
   */
  private handlePlayerHit(
    proj: Projectile,
    player: Player,
    goreManager?: GoreManager
  ): void {
    if (!player.isDead) {
      player.health = Math.max(0, player.health - proj.damage);
      player.damageFlash = 1;
      if (player.health <= 0) {
        player.isDead = true;
      }
    }

    if (goreManager) {
      goreManager.spawnHitGore(player.pos, proj.pos, proj.damage);
    }
  }

  /**
   * Handle enemy getting hit by projectile
   */
  private handleEnemyHit(
    proj: Projectile,
    sprite: { pos: Vec2; health: number; state: string; type: string },
    player: Player,
    spriteManager: SpriteManager,
    goreManager?: GoreManager
  ): void {
    const killed = spriteManager.damageSprite(
      sprite as Parameters<typeof spriteManager.damageSprite>[0],
      proj.damage,
      player,
      goreManager
    );

    // Apply splash damage
    if (proj.radius > 0) {
      spriteManager.applySplashDamage(proj.pos, proj.radius, proj.damage * 0.5, player, goreManager);
    }

    // Extra gore for overkill
    if (killed && goreManager && proj.damage > 50) {
      goreManager.spawnKillGore(sprite.pos, player.pos, true);
    }

    // Screen shake for rockets and BFG
    if (proj.type === 'rocket') {
      player.screenShake = Math.max(player.screenShake, 0.4);
    } else if (proj.type === 'bfg_ball') {
      player.screenShake = Math.max(player.screenShake, 1.0);
    }
  }

  /**
   * Get projectiles for rendering
   */
  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  /**
   * Get projectile count
   */
  getCount(): number {
    return this.projectiles.length;
  }

  /**
   * Clear all projectiles
   */
  clear(): void {
    this.projectiles = [];
  }

  /**
   * Distance between two points
   */
  private distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
