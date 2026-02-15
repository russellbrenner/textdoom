/**
 * Stats tracking and leaderboard system
 * Persists to localStorage
 */

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
const MAX_ENTRIES = 5;

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
