/**
 * Stats tracking and leaderboard system
 * Persists to localStorage
 */

import type { ShopState, WeaponType, WeaponUpgrades } from './types';

export interface GameSession {
  kills: number;
  timePlayed: number; // seconds
  date: string;       // ISO date
  mode: 'single' | 'multi' | 'online';
  username?: string;  // Player name
}

export interface Leaderboard {
  topKills: GameSession[];      // Top 5 by kills
  topTime: GameSession[];       // Top 5 by time
  totalKills: number;
  totalTimePlayed: number;      // seconds
  gamesPlayed: number;
}

const STORAGE_KEY = 'textdoom_stats';
const USERNAME_KEY = 'textdoom_username';
const SHOP_KEY = 'textdoom_shop';
const MAX_ENTRIES = 5;

/** Default weapon upgrades (all at level 0) */
const DEFAULT_UPGRADES: WeaponUpgrades = {
  fist: 0,
  knife: 0,
  hammer: 0,
  axe: 0,
  pistol: 0,
  shotgun: 0,
  chaingun: 0,
  rocket: 0,
  plasma: 0,
  bfg: 0,
  flamethrower: 0,
};

/** Maximum upgrade level per weapon */
export const MAX_UPGRADE_LEVEL = 5;

/** Base cost for first upgrade */
const BASE_UPGRADE_COST = 100;

/** Cost multiplier per level (1.5x) */
const COST_MULTIPLIER = 1.5;

/**
 * Get stored username (or null if not set)
 */
export function getUsername(): string | null {
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Set username
 */
export function setUsername(name: string): void {
  try {
    localStorage.setItem(USERNAME_KEY, name.trim().slice(0, 12)); // Max 12 chars
  } catch (e) {
    console.warn('Failed to save username:', e);
  }
}

/**
 * Load leaderboard from localStorage
 */
export function loadLeaderboard(): Leaderboard {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load stats:', e);
  }

  // Default empty leaderboard
  return {
    topKills: [],
    topTime: [],
    totalKills: 0,
    totalTimePlayed: 0,
    gamesPlayed: 0,
  };
}

/**
 * Save leaderboard to localStorage
 */
function saveLeaderboard(board: Leaderboard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

/**
 * Record a completed game session
 */
export function recordGameSession(
  kills: number,
  timePlayed: number,
  mode: 'single' | 'multi' | 'online'
): void {
  const board = loadLeaderboard();
  const username = getUsername() || 'Player';

  const session: GameSession = {
    kills,
    timePlayed,
    date: new Date().toISOString(),
    mode,
    username,
  };

  // Update totals
  board.totalKills += kills;
  board.totalTimePlayed += timePlayed;
  board.gamesPlayed++;

  // Add to top kills if qualifies
  board.topKills.push(session);
  board.topKills.sort((a, b) => b.kills - a.kills);
  board.topKills = board.topKills.slice(0, MAX_ENTRIES);

  // Add to top time if qualifies
  board.topTime.push(session);
  board.topTime.sort((a, b) => b.timePlayed - a.timePlayed);
  board.topTime = board.topTime.slice(0, MAX_ENTRIES);

  saveLeaderboard(board);
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Clear all stats (for testing)
 */
export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Load shop state from localStorage
 */
export function loadShopState(): ShopState {
  try {
    const data = localStorage.getItem(SHOP_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure all weapons have upgrade levels (handle new weapons added later)
      return {
        credits: parsed.credits ?? 0,
        upgrades: { ...DEFAULT_UPGRADES, ...parsed.upgrades },
      };
    }
  } catch (e) {
    console.warn('Failed to load shop state:', e);
  }

  return {
    credits: 0,
    upgrades: { ...DEFAULT_UPGRADES },
  };
}

/**
 * Save shop state to localStorage
 */
export function saveShopState(state: ShopState): void {
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save shop state:', e);
  }
}

/**
 * Award credits to the player
 */
export function awardCredits(amount: number): void {
  const state = loadShopState();
  state.credits += amount;
  saveShopState(state);
}

/**
 * Get the cost for the next upgrade level of a weapon
 * Returns null if weapon is already at max level
 */
export function getUpgradeCost(weapon: WeaponType): number | null {
  const state = loadShopState();
  const currentLevel = state.upgrades[weapon] ?? 0;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return null; // Already maxed
  }

  // Cost scales: 100 → 150 → 225 → 337 → 506
  return Math.floor(BASE_UPGRADE_COST * Math.pow(COST_MULTIPLIER, currentLevel));
}

/**
 * Purchase an upgrade for a weapon
 * Returns true if purchase succeeded, false otherwise
 */
export function purchaseUpgrade(weapon: WeaponType): boolean {
  const state = loadShopState();
  const currentLevel = state.upgrades[weapon] ?? 0;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return false; // Already maxed
  }

  const cost = Math.floor(BASE_UPGRADE_COST * Math.pow(COST_MULTIPLIER, currentLevel));

  if (state.credits < cost) {
    return false; // Not enough credits
  }

  state.credits -= cost;
  state.upgrades[weapon] = currentLevel + 1;
  saveShopState(state);
  return true;
}

/**
 * Get upgrade level for a weapon
 */
export function getUpgradeLevel(weapon: WeaponType): number {
  const state = loadShopState();
  return state.upgrades[weapon] ?? 0;
}

/**
 * Clear shop state (for testing)
 */
export function clearShopState(): void {
  localStorage.removeItem(SHOP_KEY);
}
