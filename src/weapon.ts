import type { WeaponState, WeaponType, Player } from './types';
import { SpriteManager } from './sprites';
import { GoreManager } from './gore';
import type { Renderer } from './renderer';

// Weapon stats: damage, cooldown, ammo type, ammo per shot, special properties
interface WeaponStats {
  damage: number;
  cooldown: number;
  ammoType: 'none' | 'bullets' | 'shells' | 'rockets' | 'cells' | 'fuel';
  ammoPerShot: number;
  pellets?: number;      // For shotgun spread
  splash?: number;       // Splash damage radius
  screenShake?: number;  // Screen shake on fire
  range?: number;        // Max effective range (for flamethrower)
  continuous?: boolean;  // Continuous fire weapon
  muzzleFlash?: number;  // Muzzle flash intensity (0-1)
}

const WEAPON_STATS: Record<WeaponType, WeaponStats> = {
  fist: {
    damage: 5,
    cooldown: 0.4,
    ammoType: 'none',
    ammoPerShot: 0,
    muzzleFlash: 0,
  },
  knife: {
    damage: 12,
    cooldown: 0.25,
    ammoType: 'none',
    ammoPerShot: 0,
    muzzleFlash: 0,
  },
  hammer: {
    damage: 35,
    cooldown: 0.8,
    ammoType: 'none',
    ammoPerShot: 0,
    screenShake: 0.2,
    muzzleFlash: 0,
  },
  axe: {
    damage: 25,
    cooldown: 0.5,
    ammoType: 'none',
    ammoPerShot: 0,
    muzzleFlash: 0,
  },
  pistol: {
    damage: 15,
    cooldown: 0.3,
    ammoType: 'bullets',
    ammoPerShot: 1,
    muzzleFlash: 0.4,
  },
  shotgun: {
    damage: 7, // Per pellet, 8 pellets = 56 max
    cooldown: 0.9,
    ammoType: 'shells',
    ammoPerShot: 1,
    pellets: 8,
    muzzleFlash: 0.8,
  },
  chaingun: {
    damage: 12,
    cooldown: 0.08,
    ammoType: 'bullets',
    ammoPerShot: 1,
    muzzleFlash: 0.5,
  },
  rocket: {
    damage: 100,
    cooldown: 1.2,
    ammoType: 'rockets',
    ammoPerShot: 1,
    splash: 3.0,
    screenShake: 0.5,
    muzzleFlash: 1.0,
  },
  plasma: {
    damage: 25,
    cooldown: 0.1,
    ammoType: 'cells',
    ammoPerShot: 1,
    muzzleFlash: 0.6,
  },
  bfg: {
    damage: 400,
    cooldown: 3.0,
    ammoType: 'cells',
    ammoPerShot: 40,
    splash: 5.0,
    screenShake: 1.0,
    muzzleFlash: 1.0,
  },
  flamethrower: {
    damage: 8,
    cooldown: 0.05,      // Very fast continuous fire
    ammoType: 'fuel',
    ammoPerShot: 1,
    range: 5.0,          // Short range
    continuous: true,
    muzzleFlash: 0.7,
  },
};

// Weapon order for switching (melee first, then ranged)
const WEAPON_ORDER: WeaponType[] = ['fist', 'knife', 'hammer', 'axe', 'pistol', 'shotgun', 'chaingun', 'rocket', 'plasma', 'bfg', 'flamethrower'];

/**
 * Create initial weapon state
 */
export function createWeapon(): WeaponState {
  return {
    type: 'pistol',
    cooldown: 0,
    animFrame: 0,
    isFiring: false,
    spinup: 0,
  };
}

/**
 * Check if player has ammo for a weapon
 */
export function hasAmmoForWeapon(player: Player, weaponType: WeaponType): boolean {
  const stats = WEAPON_STATS[weaponType];
  if (stats.ammoType === 'none') return true;
  return player.ammo[stats.ammoType] >= stats.ammoPerShot;
}

/**
 * Check if player has a weapon (currently all weapons available - can add inventory later)
 */
export function hasWeapon(_player: Player, _weaponType: WeaponType): boolean {
  return true; // For now, all weapons are available
}

/**
 * Update weapon state
 */
export function updateWeapon(
  weapon: WeaponState,
  deltaTime: number,
  isFiring: boolean,
  player: Player,
  spriteManager: SpriteManager,
  goreManager?: GoreManager,
  renderer?: Renderer
): void {
  // Update cooldown
  if (weapon.cooldown > 0) {
    weapon.cooldown -= deltaTime;
    if (weapon.cooldown <= 0) {
      weapon.isFiring = false;
    }
  }

  // Handle chaingun spinup
  if (weapon.type === 'chaingun') {
    if (isFiring && hasAmmoForWeapon(player, 'chaingun')) {
      weapon.spinup = Math.min(1, weapon.spinup + deltaTime * 3);
    } else {
      weapon.spinup = Math.max(0, weapon.spinup - deltaTime * 2);
    }
  } else {
    weapon.spinup = 0;
  }

  // Try to fire
  if (isFiring && weapon.cooldown <= 0 && !player.isDead) {
    const stats = WEAPON_STATS[weapon.type];

    // Check ammo
    if (hasAmmoForWeapon(player, weapon.type)) {
      // Fire!
      weapon.isFiring = true;

      // Chaingun fires faster as it spins up
      if (weapon.type === 'chaingun') {
        weapon.cooldown = stats.cooldown * (1.5 - weapon.spinup * 0.5);
      } else {
        weapon.cooldown = stats.cooldown;
      }

      weapon.animFrame = 0;

      // Consume ammo
      if (stats.ammoType !== 'none') {
        player.ammo[stats.ammoType] -= stats.ammoPerShot;
      }

      // Apply screen shake
      if (stats.screenShake) {
        player.screenShake = Math.max(player.screenShake, stats.screenShake);
      }

      // Apply muzzle flash
      if (stats.muzzleFlash && renderer) {
        renderer.setMuzzleFlash(stats.muzzleFlash);
      }

      // Handle hit detection
      if (weapon.type === 'flamethrower') {
        // Flamethrower: spawn flame particles and damage enemies in cone
        if (goreManager) {
          goreManager.spawnFlame(player.pos, player.dir.x, player.dir.y);
        }

        // Hit enemies in range with spread
        const range = stats.range || 5;
        for (let i = 0; i < 3; i++) {
          const spreadAngle = (Math.random() - 0.5) * 0.3; // Wide cone
          const hitSprite = spriteManager.getSpriteInDirectionWithRange(player, spreadAngle, range);
          if (hitSprite) {
            const killed = spriteManager.damageSprite(hitSprite, stats.damage, player, goreManager);
            // Show hit marker feedback
            if (renderer) renderer.showHitMarker();
            if (killed) {
              if (goreManager) goreManager.spawnKillGore(hitSprite.pos, player.pos, true);
              if (renderer) renderer.showKillMessage(hitSprite.type);
            }
          }
        }
      } else if (stats.pellets) {
        // Shotgun spread - multiple pellets
        let hitCount = 0;
        for (let i = 0; i < stats.pellets; i++) {
          const spreadAngle = (Math.random() - 0.5) * 0.15; // ~8 degree spread
          const hitSprite = spriteManager.getSpriteInDirection(player, spreadAngle);
          if (hitSprite) {
            const killed = spriteManager.damageSprite(hitSprite, stats.damage, player, goreManager);
            hitCount++;
            if (killed) {
              if (goreManager) goreManager.spawnKillGore(hitSprite.pos, player.pos, true);
              if (renderer) renderer.showKillMessage(hitSprite.type);
            }
          }
        }
        // Show hit marker if any pellets hit
        if (hitCount > 0 && renderer) renderer.showHitMarker();
      } else {
        // Single shot weapons
        const hitSprite = spriteManager.getSpriteAtCenter(player);
        if (hitSprite) {
          const killed = spriteManager.damageSprite(hitSprite, stats.damage, player, goreManager);
          // Show hit marker feedback
          if (renderer) renderer.showHitMarker();

          // Splash damage for rockets/BFG
          if (stats.splash) {
            spriteManager.applySplashDamage(hitSprite.pos, stats.splash, stats.damage * 0.5, player, goreManager);
          }

          if (killed) {
            if (goreManager) {
              const overkill = stats.damage > 50;
              goreManager.spawnKillGore(hitSprite.pos, player.pos, overkill);
            }
            if (renderer) renderer.showKillMessage(hitSprite.type);
          }
        }
      }
    }
  }

  // Update animation
  if (weapon.isFiring) {
    weapon.animFrame += deltaTime * 10;
  }
}

/**
 * Switch to a specific weapon
 */
export function switchWeapon(weapon: WeaponState, newType: WeaponType, player: Player): boolean {
  if (weapon.type === newType) return false;
  if (!hasWeapon(player, newType)) return false;

  weapon.type = newType;
  weapon.cooldown = 0.2; // Brief weapon switch delay
  weapon.isFiring = false;
  weapon.spinup = 0;
  return true;
}

/**
 * Switch to next available weapon
 */
export function switchToNextWeapon(weapon: WeaponState, player: Player): void {
  const currentIndex = WEAPON_ORDER.indexOf(weapon.type);
  for (let i = 1; i < WEAPON_ORDER.length; i++) {
    const nextIndex = (currentIndex + i) % WEAPON_ORDER.length;
    const nextWeapon = WEAPON_ORDER[nextIndex];
    if (hasWeapon(player, nextWeapon) && hasAmmoForWeapon(player, nextWeapon)) {
      switchWeapon(weapon, nextWeapon, player);
      return;
    }
  }
}

/**
 * Switch to previous available weapon
 */
export function switchToPrevWeapon(weapon: WeaponState, player: Player): void {
  const currentIndex = WEAPON_ORDER.indexOf(weapon.type);
  for (let i = 1; i < WEAPON_ORDER.length; i++) {
    const prevIndex = (currentIndex - i + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    const prevWeapon = WEAPON_ORDER[prevIndex];
    if (hasWeapon(player, prevWeapon) && hasAmmoForWeapon(player, prevWeapon)) {
      switchWeapon(weapon, prevWeapon, player);
      return;
    }
  }
}

/**
 * Switch weapon by number key (1-9, 0 for 10, - for 11)
 */
export function switchWeaponByNumber(weapon: WeaponState, num: number, player: Player): boolean {
  if (num < 1 || num > WEAPON_ORDER.length) return false;
  const newWeapon = WEAPON_ORDER[num - 1];
  return switchWeapon(weapon, newWeapon, player);
}

/**
 * Get current weapon stats
 */
export function getWeaponStats(weaponType: WeaponType): WeaponStats {
  return WEAPON_STATS[weaponType];
}
