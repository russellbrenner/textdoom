import type { Sprite, SpriteSpawn, SpriteType, Player, Vec2, GameConfig } from './types';
import { isWall } from './map';
import { Renderer } from './renderer';
import { GoreManager } from './gore';
import { awardCredits } from './stats';

const COLLISION_MARGIN = 0.3;

// Enemy stats: health, speed, damage, range, cooldown, special behaviours
interface EnemyStats {
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  projectileDamage?: number;  // For ranged attacks
  projectileRange?: number;   // Max range for projectiles
  floats?: boolean;           // Ignores floor (cacodemon)
  canSummon?: boolean;        // Can summon other enemies (cyberdemon)
}

const ENEMY_STATS: Record<string, EnemyStats> = {
  imp: {
    health: 15,           // Was 30 - dies in 1 pistol shot
    speed: 1.2,           // Was 2.0 - slower
    damage: 5,            // Was 10 - less painful
    attackRange: 1.2,
    attackCooldown: 1.5,  // Was 1.0 - attacks less often
  },
  demon: {
    health: 40,           // Was 80 - half health
    speed: 1.0,           // Was 1.5 - slower
    damage: 10,           // Was 25 - much less painful
    attackRange: 1.5,
    attackCooldown: 2.0,  // Was 1.5 - attacks less often
  },
  cacodemon: {
    health: 60,           // Was 120 - half health
    speed: 0.6,           // Was 1.0 - slower
    damage: 8,            // Was 15 - less painful
    attackRange: 8.0,
    attackCooldown: 3.0,  // Was 2.0 - attacks less often
    projectileDamage: 8,  // Was 15
    projectileRange: 8.0,
    floats: true,
  },
  baron: {
    health: 100,          // Was 200 - half health
    speed: 0.8,           // Was 1.2 - slower
    damage: 15,           // Was 40 - much less painful
    attackRange: 1.8,
    attackCooldown: 2.5,  // Was 1.5 - attacks less often
    projectileDamage: 12, // Was 30
    projectileRange: 10.0,
  },
  cyberdemon: {
    health: 200,          // Was 500 - much easier
    speed: 0.5,           // Was 0.8 - slower
    damage: 25,           // Was 80 - much less painful
    attackRange: 12.0,
    attackCooldown: 4.0,  // Was 2.5 - attacks less often
    projectileDamage: 25, // Was 80
    projectileRange: 12.0,
    canSummon: false,     // Was true - no more summons
  },
};

/** Credit rewards per enemy type */
const ENEMY_CREDITS: Record<string, number> = {
  imp: 10,
  demon: 25,
  cacodemon: 35,
  baron: 50,
  cyberdemon: 200,
};

let nextSpriteId = 1;

/**
 * Create a sprite from spawn data
 */
export function createSprite(spawn: SpriteSpawn): Sprite {
  const stats = ENEMY_STATS[spawn.type];
  return {
    id: nextSpriteId++,
    pos: { x: spawn.x + 0.5, y: spawn.y + 0.5 },
    type: spawn.type,
    health: stats?.health ?? 0,
    state: 'idle',
    animFrame: 0,
    lastSeen: 0,
    lastSeenPos: { x: 0, y: 0 },
    attackCooldown: 0,
    dir: { x: 1, y: 0 },
    velocity: { x: 0, y: 0 },
  };
}

/**
 * Check if sprite type is an enemy
 */
function isEnemy(type: SpriteType): boolean {
  return type === 'imp' || type === 'demon' || type === 'cacodemon' ||
         type === 'baron' || type === 'cyberdemon';
}

/**
 * Check if sprite type is a pickup
 */
function isPickup(type: SpriteType): boolean {
  return type === 'health' || type === 'armor' ||
         type === 'ammo_bullets' || type === 'ammo_shells' ||
         type === 'ammo_rockets' || type === 'ammo_cells' ||
         type === 'ammo_fuel';
}

/** Respawn tracking for pickups */
interface RespawnEntry {
  spawn: SpriteSpawn;
  respawnTime: number;
}

const RESPAWN_DELAY = 30000; // 30 seconds

/**
 * Sprite manager - handles all sprites and their AI
 */
export class SpriteManager {
  sprites: Sprite[] = [];
  private config: GameConfig;
  private killCount: number = 0;
  private lastSummonTime: number = 0;
  private respawnQueue: RespawnEntry[] = [];

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * Spawn sprites from spawn data
   */
  spawnSprites(spawns: SpriteSpawn[]): void {
    nextSpriteId = 1;
    this.sprites = spawns.map(createSprite);
    this.killCount = 0;
    this.lastSummonTime = Date.now();
    this.respawnQueue = []; // Clear respawn queue on reset
  }

  /**
   * Reset all sprites to initial state
   */
  reset(spawns: SpriteSpawn[]): void {
    this.spawnSprites(spawns);
  }

  /**
   * Get current kill count
   */
  getKillCount(): number {
    return this.killCount;
  }

  /**
   * Get sprites sorted by distance from player (farthest first for proper rendering)
   */
  getSortedSprites(player: Player): Sprite[] {
    return [...this.sprites]
      .filter(s => s.state !== 'dead' || s.health > -100) // Show recently dead sprites
      .sort((a, b) => {
        const distA = (a.pos.x - player.pos.x) ** 2 + (a.pos.y - player.pos.y) ** 2;
        const distB = (b.pos.x - player.pos.x) ** 2 + (b.pos.y - player.pos.y) ** 2;
        return distB - distA; // Farthest first
      });
  }

  /**
   * Update all sprites (AI, movement, animation)
   */
  update(player: Player, deltaTime: number): void {
    for (const sprite of this.sprites) {
      if (isPickup(sprite.type) || sprite.type === 'corpse' || sprite.type === 'gib') {
        continue; // Pickups and corpses don't have AI
      }

      this.updateEnemy(sprite, player, deltaTime);
    }

    // Check for pickup respawns
    const now = Date.now();
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const entry = this.respawnQueue[i];
      if (now >= entry.respawnTime) {
        // Respawn the pickup
        const newSprite = createSprite(entry.spawn);
        this.sprites.push(newSprite);
        this.respawnQueue.splice(i, 1);
      }
    }
  }

  /**
   * Update a single enemy sprite
   */
  private updateEnemy(sprite: Sprite, player: Player, deltaTime: number): void {
    // Dead enemies don't update
    if (sprite.state === 'dead') {
      return;
    }

    const stats = ENEMY_STATS[sprite.type];
    if (!stats) return;

    // Update attack cooldown
    if (sprite.attackCooldown > 0) {
      sprite.attackCooldown -= deltaTime;
    }

    // Check line of sight to player
    const canSeePlayer = this.hasLineOfSight(sprite.pos, player.pos);
    const distToPlayer = this.distance(sprite.pos, player.pos);

    if (canSeePlayer) {
      sprite.lastSeen = Date.now();
      sprite.lastSeenPos = { ...player.pos };
    }

    // Cyberdemon summon ability
    if (sprite.type === 'cyberdemon' && stats.canSummon) {
      this.handleCyberdemonSummon(sprite);
    }

    // State machine
    switch (sprite.state) {
      case 'idle':
        this.updateIdle(sprite, canSeePlayer, distToPlayer, deltaTime, stats);
        break;
      case 'chase':
        this.updateChase(sprite, player, canSeePlayer, distToPlayer, deltaTime, stats);
        break;
      case 'attack':
        this.updateAttack(sprite, player, distToPlayer, deltaTime, stats);
        break;
      case 'pain':
        this.updatePain(sprite, deltaTime);
        break;
    }

    // Update animation frame
    sprite.animFrame += deltaTime * 4;
  }

  /**
   * Idle state - wander or notice player
   */
  private updateIdle(
    sprite: Sprite,
    canSeePlayer: boolean,
    distToPlayer: number,
    deltaTime: number,
    stats: EnemyStats
  ): void {
    if (canSeePlayer && distToPlayer < 12) {
      sprite.state = 'chase';
      return;
    }

    // Random wandering
    if (Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      sprite.dir = { x: Math.cos(angle), y: Math.sin(angle) };
    }

    // Slow idle movement
    const speed = stats.speed * 0.2 * deltaTime;
    this.moveSprite(sprite, sprite.dir.x * speed, sprite.dir.y * speed, stats);
  }

  /**
   * Chase state - move towards player
   */
  private updateChase(
    sprite: Sprite,
    player: Player,
    canSeePlayer: boolean,
    distToPlayer: number,
    deltaTime: number,
    stats: EnemyStats
  ): void {
    // Close enough to attack?
    if (distToPlayer < stats.attackRange) {
      sprite.state = 'attack';
      return;
    }

    // Lost sight of player for too long?
    if (!canSeePlayer && Date.now() - sprite.lastSeen > 3000) {
      sprite.state = 'idle';
      return;
    }

    // Cacodemon strafing behaviour
    if (sprite.type === 'cacodemon' && canSeePlayer && distToPlayer < stats.attackRange * 1.5) {
      // Strafe while maintaining distance
      const perpX = -sprite.dir.y;
      const perpY = sprite.dir.x;
      const strafeDir = Math.sin(Date.now() / 500) > 0 ? 1 : -1;
      const speed = stats.speed * 0.5 * deltaTime;
      this.moveSprite(sprite, perpX * speed * strafeDir, perpY * speed * strafeDir, stats);
      sprite.state = 'attack';
      return;
    }

    // Move towards player (or last seen position)
    const target = canSeePlayer ? player.pos : sprite.lastSeenPos;
    const dx = target.x - sprite.pos.x;
    const dy = target.y - sprite.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.1) {
      sprite.dir = { x: dx / dist, y: dy / dist };
      const speed = stats.speed * deltaTime;
      this.moveSprite(sprite, sprite.dir.x * speed, sprite.dir.y * speed, stats);
    }
  }

  /**
   * Attack state - damage player
   */
  private updateAttack(
    sprite: Sprite,
    player: Player,
    distToPlayer: number,
    _deltaTime: number,
    stats: EnemyStats
  ): void {
    // Too far to attack?
    if (distToPlayer > stats.attackRange * 1.5) {
      sprite.state = 'chase';
      return;
    }

    // Can attack?
    if (sprite.attackCooldown <= 0) {
      // Calculate damage direction (from enemy to player)
      const dx = sprite.pos.x - player.pos.x;
      const dy = sprite.pos.y - player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const damageDir = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };

      // Ranged enemies use projectiles
      if (stats.projectileDamage && distToPlayer > 2) {
        // Just mark as attacking - actual projectile system would handle this
        // For now, instant hitscan damage at range
        if (!player.isDead && this.hasLineOfSight(sprite.pos, player.pos)) {
          const damage = stats.projectileDamage;
          player.health = Math.max(0, player.health - damage);
          player.damageFlash = 1;
          player.damageDirection = damageDir;
          if (player.health <= 0) {
            player.isDead = true;
          }
        }
      } else {
        // Melee damage
        if (!player.isDead) {
          player.health = Math.max(0, player.health - stats.damage);
          player.damageFlash = 1;
          player.damageDirection = damageDir;
          if (player.health <= 0) {
            player.isDead = true;
          }
        }
      }
      sprite.attackCooldown = stats.attackCooldown;
    }
  }

  /**
   * Pain state - brief stun after being hit
   */
  private updatePain(sprite: Sprite, deltaTime: number): void {
    sprite.attackCooldown -= deltaTime;
    if (sprite.attackCooldown <= 0) {
      sprite.state = 'chase';
    }
  }

  /**
   * Handle cyberdemon's summon ability
   */
  private handleCyberdemonSummon(sprite: Sprite): void {
    const now = Date.now();
    // Summon 2 imps every 60 seconds
    if (now - this.lastSummonTime > 60000) {
      this.lastSummonTime = now;

      // Spawn imps near the cyberdemon
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnX = sprite.pos.x + Math.cos(angle) * 2;
        const spawnY = sprite.pos.y + Math.sin(angle) * 2;

        if (!isWall(spawnX, spawnY)) {
          const newImp = createSprite({
            x: Math.floor(spawnX),
            y: Math.floor(spawnY),
            type: 'imp',
          });
          newImp.pos = { x: spawnX, y: spawnY };
          this.sprites.push(newImp);
        }
      }
    }
  }

  /**
   * Move sprite with collision detection
   */
  private moveSprite(sprite: Sprite, dx: number, dy: number, stats: EnemyStats): void {
    const newX = sprite.pos.x + dx;
    const newY = sprite.pos.y + dy;

    // Floating enemies (cacodemon) ignore some collisions
    if (stats.floats) {
      // Only check wall collisions, not floor
      if (!isWall(newX, sprite.pos.y)) {
        sprite.pos.x = newX;
      }
      if (!isWall(sprite.pos.x, newY)) {
        sprite.pos.y = newY;
      }
    } else {
      // Check collision with walls
      if (!isWall(newX + Math.sign(dx) * COLLISION_MARGIN, sprite.pos.y)) {
        sprite.pos.x = newX;
      }
      if (!isWall(sprite.pos.x, newY + Math.sign(dy) * COLLISION_MARGIN)) {
        sprite.pos.y = newY;
      }
    }

    // Avoid other sprites (simple separation)
    for (const other of this.sprites) {
      if (other.id === sprite.id) continue;
      if (other.state === 'dead' || other.type === 'corpse' || other.type === 'gib') continue;
      if (isPickup(other.type)) continue;

      const dist = this.distance(sprite.pos, other.pos);
      if (dist < 0.8 && dist > 0.01) {
        const pushX = (sprite.pos.x - other.pos.x) / dist * 0.1;
        const pushY = (sprite.pos.y - other.pos.y) / dist * 0.1;
        sprite.pos.x += pushX;
        sprite.pos.y += pushY;
      }
    }
  }

  /**
   * Check line of sight between two points
   */
  hasLineOfSight(from: Vec2, to: Vec2): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist * 4); // 4 checks per unit

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;

      if (isWall(x, y)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Damage a sprite
   * Returns true if the sprite was killed
   */
  damageSprite(sprite: Sprite, damage: number, player?: Player, goreManager?: GoreManager): boolean {
    const previousHealth = sprite.health;
    sprite.health -= damage;

    // Spawn blood particles on hit
    if (goreManager && player) {
      goreManager.spawnHitGore(sprite.pos, player.pos, damage);
    }

    if (sprite.health <= 0) {
      sprite.state = 'dead';
      sprite.health = 0;
      this.killCount++;

      // Award credits for the kill
      const credits = ENEMY_CREDITS[sprite.type] || 10;
      awardCredits(credits);

      // Check for overkill (damage > remaining HP × 2)
      const overkill = damage > previousHealth * 2;
      if (goreManager && player) {
        goreManager.spawnKillGore(sprite.pos, player.pos, overkill);
      }

      return true;
    } else {
      sprite.state = 'pain';
      sprite.attackCooldown = 0.3; // Pain duration
      return false;
    }
  }

  /**
   * Apply splash damage to sprites near a point
   */
  applySplashDamage(
    center: Vec2,
    radius: number,
    damage: number,
    player: Player,
    goreManager?: GoreManager
  ): void {
    for (const sprite of this.sprites) {
      if (sprite.state === 'dead' || !isEnemy(sprite.type)) continue;

      const dist = this.distance(center, sprite.pos);
      if (dist < radius && dist > 0.1) {
        // Damage falls off with distance
        const falloff = 1 - (dist / radius);
        const actualDamage = Math.floor(damage * falloff);
        if (actualDamage > 0) {
          this.damageSprite(sprite, actualDamage, player, goreManager);
        }
      }
    }
  }

  /**
   * Get sprites sorted by distance (far to near for painter's algorithm)
   */
  getVisibleSprites(player: Player): Array<{ sprite: Sprite; distance: number; screenX: number; screenHeight: number }> {
    const visible: Array<{ sprite: Sprite; distance: number; screenX: number; screenHeight: number }> = [];

    for (const sprite of this.sprites) {
      // Calculate relative position
      const dx = sprite.pos.x - player.pos.x;
      const dy = sprite.pos.y - player.pos.y;

      // Transform to camera space
      const invDet = 1 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);
      const transformX = invDet * (player.dir.y * dx - player.dir.x * dy);
      const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy);

      // Behind camera?
      if (transformY <= 0.1) continue;

      // Calculate screen position
      const screenX = Math.floor((this.config.screenWidth / 2) * (1 + transformX / transformY));

      // Calculate sprite height on screen
      const spriteHeight = Math.abs(Math.floor(this.config.screenHeight / transformY));

      // Check if on screen
      const spriteWidth = spriteHeight; // Square sprites
      if (screenX + spriteWidth / 2 < 0 || screenX - spriteWidth / 2 >= this.config.screenWidth) {
        continue;
      }

      visible.push({
        sprite,
        distance: transformY,
        screenX,
        screenHeight: spriteHeight,
      });
    }

    // Sort far to near
    visible.sort((a, b) => b.distance - a.distance);

    return visible;
  }

  /**
   * Render all visible sprites
   */
  renderSprites(player: Player, renderer: Renderer): void {
    const visibleSprites = this.getVisibleSprites(player);

    for (const { sprite, distance, screenX, screenHeight } of visibleSprites) {
      const spriteWidth = screenHeight; // Square sprites
      const startX = Math.floor(screenX - spriteWidth / 2);
      const startY = Math.floor((this.config.screenHeight - screenHeight) / 2);

      // Determine state for rendering
      const state = sprite.state === 'dead' ? 'dead' : sprite.state;

      // Draw each column of the sprite
      for (let col = 0; col < spriteWidth; col++) {
        const x = startX + col;
        if (x < 0 || x >= this.config.screenWidth) continue;

        renderer.drawSpriteColumn(
          x,
          startY,
          screenHeight,
          sprite.type,
          state,
          col,
          spriteWidth,
          distance
        );
      }

      // Draw health bar for enemies (only when damaged)
      if (isEnemy(sprite.type) && sprite.state !== 'dead') {
        const maxHealth = ENEMY_STATS[sprite.type]?.health || 100;
        renderer.drawSpriteHealthBar(
          screenX,
          startY,
          spriteWidth,
          sprite.health,
          maxHealth,
          distance
        );
      }
    }
  }

  /**
   * Check for pickup collisions with player
   */
  checkPickups(player: Player): void {
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const sprite = this.sprites[i];

      if (!isPickup(sprite.type)) continue;

      const dist = this.distance(sprite.pos, player.pos);
      if (dist < 0.5) {
        let pickedUp = false;

        switch (sprite.type) {
          case 'health':
            if (player.health < 100) {
              player.health = Math.min(100, player.health + 25);
              pickedUp = true;
            }
            break;
          case 'armor':
            if (player.armor < 100) {
              player.armor = Math.min(100, player.armor + 25);
              pickedUp = true;
            }
            break;
          case 'ammo_bullets':
            player.ammo.bullets += 20;
            pickedUp = true;
            break;
          case 'ammo_shells':
            player.ammo.shells += 8;
            pickedUp = true;
            break;
          case 'ammo_rockets':
            player.ammo.rockets += 5;
            pickedUp = true;
            break;
          case 'ammo_cells':
            player.ammo.cells += 40;
            pickedUp = true;
            break;
          case 'ammo_fuel':
            player.ammo.fuel += 50;
            pickedUp = true;
            break;
        }

        if (pickedUp) {
          // Add to respawn queue
          this.respawnQueue.push({
            spawn: {
              x: Math.floor(sprite.pos.x),
              y: Math.floor(sprite.pos.y),
              type: sprite.type,
            },
            respawnTime: Date.now() + RESPAWN_DELAY,
          });
          this.sprites.splice(i, 1);
        }
      }
    }
  }

  /**
   * Find sprite at crosshair (for shooting)
   */
  getSpriteAtCenter(player: Player): Sprite | null {
    return this.getSpriteInDirection(player, 0);
  }

  /**
   * Find sprite in a specific direction with range limit (for flamethrower)
   */
  getSpriteInDirectionWithRange(player: Player, angleOffset: number, maxRange: number): Sprite | null {
    // Calculate aim direction with offset
    let aimDirX = player.dir.x;
    let aimDirY = player.dir.y;

    if (angleOffset !== 0) {
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      aimDirX = player.dir.x * cos - player.dir.y * sin;
      aimDirY = player.dir.x * sin + player.dir.y * cos;
    }

    let closestSprite: Sprite | null = null;
    let closestDist = Infinity;

    for (const sprite of this.sprites) {
      if (sprite.state === 'dead' || !isEnemy(sprite.type)) {
        continue;
      }

      const dx = sprite.pos.x - player.pos.x;
      const dy = sprite.pos.y - player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5 || dist > maxRange) continue; // Range check

      const angleToSprite = Math.atan2(dy, dx);
      const aimAngle = Math.atan2(aimDirY, aimDirX);
      let angleDiff = angleToSprite - aimAngle;

      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Wider cone for flamethrower
      const crosshairAngle = 0.2;
      if (Math.abs(angleDiff) < crosshairAngle) {
        if (this.hasLineOfSight(player.pos, sprite.pos)) {
          if (dist < closestDist) {
            closestDist = dist;
            closestSprite = sprite;
          }
        }
      }
    }

    return closestSprite;
  }

  /**
   * Find sprite in a specific direction (for shotgun spread)
   */
  getSpriteInDirection(player: Player, angleOffset: number): Sprite | null {
    // Calculate aim direction with offset
    let aimDirX = player.dir.x;
    let aimDirY = player.dir.y;

    if (angleOffset !== 0) {
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      aimDirX = player.dir.x * cos - player.dir.y * sin;
      aimDirY = player.dir.x * sin + player.dir.y * cos;
    }

    let closestSprite: Sprite | null = null;
    let closestDist = Infinity;

    for (const sprite of this.sprites) {
      if (sprite.state === 'dead' || !isEnemy(sprite.type)) {
        continue;
      }

      // Check if sprite is roughly in front of player
      const dx = sprite.pos.x - player.pos.x;
      const dy = sprite.pos.y - player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5) continue; // Too close

      // Calculate angle to sprite
      const angleToSprite = Math.atan2(dy, dx);
      const aimAngle = Math.atan2(aimDirY, aimDirX);
      let angleDiff = angleToSprite - aimAngle;

      // Normalise angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if sprite is within crosshair (about 5 degrees)
      const crosshairAngle = 0.1;
      if (Math.abs(angleDiff) < crosshairAngle) {
        // Check line of sight
        if (this.hasLineOfSight(player.pos, sprite.pos)) {
          if (dist < closestDist) {
            closestDist = dist;
            closestSprite = sprite;
          }
        }
      }
    }

    return closestSprite;
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
