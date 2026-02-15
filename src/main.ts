import type { GameConfig } from './types';
import { Renderer } from './renderer';
import { DoomRenderer } from './doom-renderer';
import { Raycaster } from './raycaster';
import { InputHandler } from './input';
import { createPlayer, updatePlayer, resetPlayer } from './player';
import { getWallType, SPRITE_SPAWNS, TORCH_LIGHTS } from './map';
import { SpriteManager } from './sprites';
import { createWeapon, updateWeapon } from './weapon';
import { GoreManager } from './gore';
import { networkManager } from './network';
import { loadLeaderboard, recordGameSession, getUsername, setUsername, loadShopState, purchaseUpgrade, type Leaderboard } from './stats';
import type { WeaponType, ShopState } from './types';

// Renderer mode: 'webgl' for new 3D ASCII, 'canvas' for legacy
// Using canvas for now as it's more stable and readable
const RENDERER_MODE = 'canvas' as 'webgl' | 'canvas';

// Game configuration - HIGH RESOLUTION
const CONFIG: GameConfig = {
  screenWidth: 200,       // Character columns (was 120)
  screenHeight: 60,       // Character rows (was 40)
  cellWidth: 6,           // Pixels per character width (smaller = sharper)
  cellHeight: 10,         // Pixels per character height
  moveSpeed: 3.5,         // Units per second
  rotSpeed: 2.5,          // Radians per second
};

// Game modes
type GameMode = 'menu' | 'single' | 'multi' | 'online' | 'tutorial' | 'lobby_host' | 'lobby_join' | 'username' | 'shop';

// Game state
let lastTime = 0;
let fpsCounter = 0;
let fpsTime = 0;
let currentFps = 0;
let gameMode: GameMode = getUsername() ? 'menu' : 'username'; // Start with username if not set
let menuSelection = 0;  // 0 = single, 1 = local multi, 2 = host, 3 = join
let usernameInput = '';  // For username entry

// Online state
let lobbyStatus = '';
let joinCode = '';
let networkUpdateTimer = 0;
const NETWORK_UPDATE_RATE = 1 / 30; // 30 updates per second

// Session tracking for leaderboard
let sessionStartTime = 0;
let leaderboard: Leaderboard = loadLeaderboard();

// Shop state
let shopState: ShopState = loadShopState();
let shopSelection = 0; // Currently selected weapon index (0-10)

// Pause state (single player only)
let isPaused = false;

// Weapon order for shop (same as weapon.ts)
const SHOP_WEAPONS: WeaponType[] = ['fist', 'knife', 'hammer', 'axe', 'pistol', 'shotgun', 'chaingun', 'rocket', 'plasma', 'bfg', 'flamethrower'];

// Initialise game components
const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

// Initialize renderers based on mode
const canvasRenderer = new Renderer(canvas, CONFIG);
let doomRenderer: DoomRenderer | null = null;

// Try to initialize WebGL renderer
if (RENDERER_MODE === 'webgl') {
  try {
    doomRenderer = new DoomRenderer(canvas, CONFIG);
    console.log('WebGL 3D ASCII renderer initialized');
  } catch (e) {
    console.warn('WebGL not available, falling back to canvas:', e);
  }
}

// Use the appropriate renderer
const renderer = canvasRenderer; // Keep for compatibility
const raycaster = new Raycaster(CONFIG);
const input = new InputHandler();
const spriteManager = new SpriteManager(CONFIG);
const goreManager = new GoreManager(CONFIG);

// Create players and weapons (will be reset when game starts)
let player1 = createPlayer(1);
let player2 = createPlayer(2);
let weapon1 = createWeapon();
let weapon2 = createWeapon();

// Spawn initial sprites
spriteManager.spawnSprites(SPRITE_SPAWNS);

// Listen for special keys
let restartPressed = false;
let menuUpPressed = false;
let menuDownPressed = false;
let menuSelectPressed = false;

window.addEventListener('keydown', (e) => {
  if (gameMode === 'username') {
    // Username entry
    if (e.code === 'Enter' && usernameInput.length >= 1) {
      setUsername(usernameInput);
      gameMode = 'menu';
    } else if (e.code === 'Backspace') {
      usernameInput = usernameInput.slice(0, -1);
      e.preventDefault();
    } else if (e.key.length === 1 && /[a-zA-Z0-9_\- ]/.test(e.key) && usernameInput.length < 12) {
      usernameInput += e.key;
    }
  } else if (gameMode === 'menu') {
    // Menu navigation
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      menuUpPressed = true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      menuDownPressed = true;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      menuSelectPressed = true;
    }
    if (e.code === 'KeyH') {
      gameMode = 'tutorial';
    }
  } else if (gameMode === 'lobby_join') {
    // Handle code entry
    if (e.code === 'Escape') {
      gameMode = 'menu';
      joinCode = '';
      lobbyStatus = '';
    } else if (e.code === 'Enter' && joinCode.length === 4) {
      // Try to join
      lobbyStatus = 'Connecting...';
      networkManager.joinGame(
        joinCode,
        handleConnectionChange,
        handleNetworkMessage
      ).catch((err) => {
        lobbyStatus = `Error: ${err}`;
      });
    } else if (e.code === 'Backspace') {
      joinCode = joinCode.slice(0, -1);
    } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && joinCode.length < 4) {
      joinCode += e.key.toUpperCase();
    }
  } else if (gameMode === 'lobby_host') {
    if (e.code === 'Escape') {
      networkManager.disconnect();
      gameMode = 'menu';
      lobbyStatus = '';
    }
  } else if (gameMode === 'tutorial') {
    // Exit tutorial back to menu or game
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyH' || e.code === 'Escape') {
      gameMode = 'menu';
      e.preventDefault();
    }
  } else if (gameMode === 'shop') {
    // Shop controls
    if (e.code === 'Escape') {
      gameMode = 'menu';
      e.preventDefault();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      shopSelection = Math.max(0, shopSelection - 1);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      shopSelection = Math.min(SHOP_WEAPONS.length - 1, shopSelection + 1);
    } else {
      // Number key purchases (1-9, 0 for 10, - for 11)
      let weaponIndex = -1;
      if (e.code === 'Digit1') weaponIndex = 0;
      else if (e.code === 'Digit2') weaponIndex = 1;
      else if (e.code === 'Digit3') weaponIndex = 2;
      else if (e.code === 'Digit4') weaponIndex = 3;
      else if (e.code === 'Digit5') weaponIndex = 4;
      else if (e.code === 'Digit6') weaponIndex = 5;
      else if (e.code === 'Digit7') weaponIndex = 6;
      else if (e.code === 'Digit8') weaponIndex = 7;
      else if (e.code === 'Digit9') weaponIndex = 8;
      else if (e.code === 'Digit0') weaponIndex = 9;
      else if (e.code === 'Minus') weaponIndex = 10;

      if (weaponIndex >= 0 && weaponIndex < SHOP_WEAPONS.length) {
        const weapon = SHOP_WEAPONS[weaponIndex];
        if (purchaseUpgrade(weapon)) {
          // Refresh shop state after purchase
          shopState = loadShopState();
        }
      }
    }
  } else {
    // In-game controls

    // Pause toggle (P or Escape in single player)
    if (e.code === 'KeyP' || (e.code === 'Escape' && gameMode === 'single')) {
      if (gameMode === 'single') {
        isPaused = !isPaused;
        e.preventDefault();
        return;
      }
    }

    // If paused, only handle unpause
    if (isPaused) {
      return;
    }

    if (e.code === 'KeyR') {
      const p1Dead = player1.isDead;
      const p2Dead = (gameMode === 'multi' || gameMode === 'online') ? player2.isDead : true;
      if (p1Dead || p2Dead) {
        restartPressed = true;
      }
    }
    if (e.code === 'KeyH') {
      isPaused = false; // Unpause if opening help
      gameMode = 'tutorial';
    }
    if (e.code === 'Escape') {
      // Non-single player: exit to menu
      endSession(); // Record stats before leaving
      if (gameMode === 'online') {
        networkManager.disconnect();
      }
      isPaused = false;
      gameMode = 'menu';
    }
  }
});

/**
 * Handle network connection changes
 */
function handleConnectionChange(connected: boolean, error?: string): void {
  if (connected) {
    lobbyStatus = 'Connected!';
    // Start the game
    setTimeout(() => {
      startOnlineGame();
    }, 500);
  } else {
    lobbyStatus = error || 'Disconnected';
    if (gameMode === 'online') {
      endSession(); // Record stats when disconnected
      gameMode = 'menu';
    }
  }
}

/**
 * Handle incoming network messages
 */
function handleNetworkMessage(message: any): void {
  if (message.type === 'player_state') {
    // Update remote player (player2 for host, player1's view of remote for guest)
    networkManager.applyPlayerState(player2, weapon2, message.data);
  } else if (message.type === 'weapon_fire') {
    // Remote player fired
    weapon2.isFiring = true;
    setTimeout(() => { weapon2.isFiring = false; }, 100);
  }
}

/**
 * Start hosting an online game
 */
async function startHosting(): Promise<void> {
  gameMode = 'lobby_host';
  lobbyStatus = 'Creating room...';

  try {
    const code = await networkManager.hostGame(
      handleConnectionChange,
      handleNetworkMessage
    );
    lobbyStatus = `Room ready! Code: ${code}`;
  } catch (err) {
    lobbyStatus = `Error: ${err}`;
  }
}

/**
 * Start online game after connection
 */
function startOnlineGame(): void {
  gameMode = 'online';

  // Reset players - host is P1, guest is P2
  player1 = createPlayer(1);
  weapon1 = createWeapon();
  player2 = createPlayer(2);
  weapon2 = createWeapon();

  renderer.setSplitScreen(true);

  if (networkManager.getIsHost()) {
    input.setWeaponContext(weapon1, player1);
  } else {
    // Guest controls P1 locally, sees host as P2
    input.setWeaponContext(weapon1, player1);
  }

  // Reset sprites and gore
  spriteManager.reset(SPRITE_SPAWNS);
  goreManager.clear();

  // Start session tracking
  sessionStartTime = performance.now();
}

/**
 * Start a new game
 */
function startGame(mode: 'single' | 'multi'): void {
  gameMode = mode;

  // Reset players
  player1 = createPlayer(1);
  weapon1 = createWeapon();

  if (mode === 'multi') {
    player2 = createPlayer(2);
    weapon2 = createWeapon();
    renderer.setSplitScreen(true);
    input.setMultiplayerContext(weapon1, player1, weapon2, player2);
  } else {
    renderer.setSplitScreen(false);
    input.setWeaponContext(weapon1, player1);
  }

  // Reset sprites and gore
  spriteManager.reset(SPRITE_SPAWNS);
  goreManager.clear();

  // Start session tracking
  sessionStartTime = performance.now();
}

/**
 * Restart the current game
 */
function restartGame(): void {
  resetPlayer(player1, 1);
  Object.assign(weapon1, createWeapon());

  if (gameMode === 'multi' || gameMode === 'online') {
    resetPlayer(player2, 2);
    Object.assign(weapon2, createWeapon());
  }

  spriteManager.reset(SPRITE_SPAWNS);
  goreManager.clear();
}

/**
 * End current session and record stats
 */
function endSession(): void {
  if (sessionStartTime === 0) return; // No active session

  const timePlayed = (performance.now() - sessionStartTime) / 1000; // Convert to seconds
  const kills = spriteManager.getKillCount();

  // Only record if player actually played (more than 5 seconds)
  if (timePlayed > 5) {
    const mode = gameMode === 'single' ? 'single' : gameMode === 'multi' ? 'multi' : 'online';
    recordGameSession(kills, timePlayed, mode);
    leaderboard = loadLeaderboard(); // Refresh leaderboard
  }

  sessionStartTime = 0;
}

/**
 * Render single player view (WebGL or Canvas)
 */
function renderSinglePlayerView(): void {
  // Cast rays
  const rays = raycaster.castRays(player1);

  if (doomRenderer) {
    // WebGL 3D ASCII rendering
    doomRenderer.beginFrame();
    doomRenderer.setCamera(player1);

    // Draw floor/ceiling
    doomRenderer.drawFloorCeiling(player1);

    // Draw walls
    doomRenderer.drawWalls(rays.map((hit) => ({
      perpWallDist: hit.distance,
      side: hit.side,
      wallType: getWallType(hit.mapX, hit.mapY),
      wallX: hit.wallX,
    })));

    // Draw sprites (enemies)
    const sortedSprites = spriteManager.getSortedSprites(player1);
    for (const sprite of sortedSprites) {
      const distance = Math.sqrt((sprite.pos.x - player1.pos.x) ** 2 + (sprite.pos.y - player1.pos.y) ** 2);
      doomRenderer.drawSprite(
        sprite.pos,
        distance,
        sprite.type,
        sprite.state,
        sprite.health,
        100 // Max health
      );
    }

    // Draw particles
    doomRenderer.drawParticles();

    // Draw weapon
    doomRenderer.drawWeapon(weapon1, player1);

    // Draw HUD
    doomRenderer.drawHUD(player1, weapon1, spriteManager.getKillCount());

    doomRenderer.endFrame();
  } else {
    // Fallback canvas rendering
    renderer.drawFloorCeiling(player1, rays);

    for (let x = 0; x < rays.length; x++) {
      const hit = rays[x];
      const wallHeight = raycaster.calculateWallHeight(hit.distance);
      const wallType = getWallType(hit.mapX, hit.mapY);
      renderer.drawWallStrip(x, wallHeight, hit.distance, hit.side, wallType, hit.wallX);
    }

    renderer.drawBloodDecals(goreManager.getDecals(), player1);
    spriteManager.renderSprites(player1, renderer);
    renderer.drawGoreParticles(goreManager.getParticles(), player1);
    renderer.drawWeapon(weapon1);
    renderer.drawHUD(player1, weapon1, spriteManager.getKillCount());
  }
}

/**
 * Render one player's view for split-screen
 */
function renderPlayerView(
  playerId: 1 | 2,
  player: typeof player1,
  weapon: typeof weapon1
): void {
  // Set viewport for this player
  renderer.setViewport(playerId);

  // Clear this viewport
  renderer.clear();

  // Cast rays for this player's view (using half-width for split-screen)
  const halfWidth = Math.floor(CONFIG.screenWidth / 2);
  const rays = [];
  for (let x = 0; x < halfWidth; x++) {
    const cameraX = (2 * x) / halfWidth - 1;
    const rayDirX = player.dir.x + player.plane.x * cameraX;
    const rayDirY = player.dir.y + player.plane.y * cameraX;

    // Cast single ray
    let mapX = Math.floor(player.pos.x);
    let mapY = Math.floor(player.pos.y);
    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX: number, stepY: number;
    let sideDistX: number, sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.pos.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.pos.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.pos.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.pos.y) * deltaDistY;
    }

    let side: 0 | 1 = 0;
    let hit = false;
    while (!hit) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapX >= 24 || mapY < 0 || mapY >= 24) hit = true;
      else if (getWallType(mapX, mapY) > 0) hit = true;
    }

    let perpWallDist = side === 0
      ? sideDistX - deltaDistX
      : sideDistY - deltaDistY;
    if (perpWallDist < 0.01) perpWallDist = 0.01;

    let wallX = side === 0
      ? player.pos.y + perpWallDist * rayDirY
      : player.pos.x + perpWallDist * rayDirX;
    wallX -= Math.floor(wallX);

    rays.push({
      distance: perpWallDist,
      side,
      wallX,
      mapX,
      mapY,
    });
  }

  // Draw textured floor and ceiling
  renderer.drawFloorCeiling(player, rays);

  // Render walls
  const vp = renderer.getViewport();
  for (let i = 0; i < rays.length; i++) {
    const hit = rays[i];
    const wallHeight = raycaster.calculateWallHeight(hit.distance);
    const wallType = getWallType(hit.mapX, hit.mapY);
    renderer.drawWallStrip(vp.x + i, wallHeight, hit.distance, hit.side, wallType, hit.wallX);
  }

  // Draw blood decals on floor
  renderer.drawBloodDecals(goreManager.getDecals(), player);

  // Render sprites
  spriteManager.renderSprites(player, renderer);

  // Draw gore particles
  renderer.drawGoreParticles(goreManager.getParticles(), player);

  // Draw weapon overlay
  renderer.drawWeapon(weapon);

  // Draw HUD with weapon
  renderer.drawHUD(player, weapon, undefined, playerId);
}

/**
 * Main game loop
 */
function gameLoop(timestamp: number): void {
  // Calculate delta time in seconds
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap at 100ms
  lastTime = timestamp;

  // Update FPS counter
  fpsCounter++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    currentFps = fpsCounter / fpsTime;
    fpsCounter = 0;
    fpsTime = 0;
  }

  // Update animation time (for menu background)
  renderer.updateAnimation(deltaTime);

  // Handle different game modes
  if (gameMode === 'username') {
    renderer.drawUsernameEntry(usernameInput);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameMode === 'menu') {
    // Handle menu input
    if (menuUpPressed) {
      menuSelection = Math.max(0, menuSelection - 1);
      menuUpPressed = false;
    }
    if (menuDownPressed) {
      menuSelection = Math.min(4, menuSelection + 1); // 5 options now (0-4)
      menuDownPressed = false;
    }
    if (menuSelectPressed) {
      menuSelectPressed = false;
      switch (menuSelection) {
        case 0:
          startGame('single');
          break;
        case 1:
          startGame('multi');
          break;
        case 2:
          startHosting();
          break;
        case 3:
          gameMode = 'lobby_join';
          joinCode = '';
          lobbyStatus = '';
          break;
        case 4:
          // Open shop
          shopState = loadShopState(); // Refresh shop state
          shopSelection = 0;
          gameMode = 'shop';
          break;
      }
    }

    // Draw menu with leaderboard
    if (doomRenderer) {
      doomRenderer.update(deltaTime);
      doomRenderer.drawMainMenu(menuSelection, leaderboard);
    } else {
      renderer.drawMainMenu(menuSelection, leaderboard);
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameMode === 'shop') {
    // Draw shop screen
    renderer.drawShop(shopState, shopSelection);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameMode === 'lobby_host' || gameMode === 'lobby_join') {
    renderer.drawOnlineLobby(
      gameMode === 'lobby_host',
      networkManager.getRoomCode(),
      lobbyStatus,
      joinCode
    );
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameMode === 'tutorial') {
    renderer.setSplitScreen(false);
    renderer.drawTutorial();
    requestAnimationFrame(gameLoop);
    return;
  }

  // Pause screen (single player only)
  if (isPaused && gameMode === 'single') {
    renderer.drawPauseScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  // Handle restart
  if (restartPressed) {
    restartGame();
    restartPressed = false;
  }

  // Get input states
  const input1 = input.getState(1);

  // Update movement state for weapon bob
  const isMoving = input1.forward || input1.backward || input1.strafeLeft || input1.strafeRight;
  renderer.setMoving(isMoving);

  // Update player 1 (local player)
  updatePlayer(player1, input1, deltaTime, CONFIG);
  updateWeapon(weapon1, deltaTime, input1.fire, player1, spriteManager, goreManager, renderer);

  // Handle online sync
  if (gameMode === 'online' && networkManager.isConnected()) {
    networkUpdateTimer += deltaTime;
    if (networkUpdateTimer >= NETWORK_UPDATE_RATE) {
      networkUpdateTimer = 0;
      // Send our player state to remote
      networkManager.sendPlayerState(player1, weapon1);
    }
  }

  // Update player 2 if local multiplayer
  if (gameMode === 'multi') {
    const input2 = input.getState(2);
    updatePlayer(player2, input2, deltaTime, CONFIG);
    updateWeapon(weapon2, deltaTime, input2.fire, player2, spriteManager, goreManager, renderer);
  }
  // For online, player2 is updated via network messages

  // Update sprites (AI) - uses player1 as primary target
  spriteManager.update(player1, deltaTime);

  // Check pickup collisions
  spriteManager.checkPickups(player1);
  if (gameMode === 'multi' || gameMode === 'online') {
    spriteManager.checkPickups(player2);
  }

  // Update gore particles
  goreManager.update(deltaTime);

  // Apply screen shake
  const maxShake = (gameMode === 'multi' || gameMode === 'online')
    ? Math.max(player1.screenShake, player2.screenShake)
    : player1.screenShake;
  renderer.applyScreenShake(maxShake);

  // Update WebGL renderer effects
  if (doomRenderer) {
    doomRenderer.update(deltaTime);
    doomRenderer.setScreenShake(maxShake);

    // Damage flash
    if (player1.damageFlash > 0) {
      doomRenderer.setDamageFlash(player1.damageFlash, true);
    }

    // Weapon bob based on movement
    const isMoving = input.getState(1).forward || input.getState(1).backward ||
                     input.getState(1).strafeLeft || input.getState(1).strafeRight;
    doomRenderer.setWeaponBob(isMoving);

    // Spawn particles for gore
    for (const particle of goreManager.getParticles()) {
      if (particle.life > 0.95) { // New particle
        doomRenderer.spawnBlood({ x: particle.pos.x, y: particle.pos.y }, 1);
      }
    }
  }

  // Set up lighting
  renderer.clearLights();
  for (const torch of TORCH_LIGHTS) {
    renderer.addLight(torch);
  }

  if (gameMode === 'single') {
    // Single player rendering
    renderer.clear();
    renderSinglePlayerView();
  } else {
    // Multiplayer split-screen rendering (local or online)
    const ctx = (renderer as any).ctx;
    ctx.save();
    ctx.translate((renderer as any).shakeOffset?.x || 0, (renderer as any).shakeOffset?.y || 0);

    renderPlayerView(1, player1, weapon1);
    renderPlayerView(2, player2, weapon2);

    renderer.drawSplitDivider();
    ctx.restore();

    // Show network status for online games
    if (gameMode === 'online') {
      renderer.drawNetworkStatus(networkManager.getLatency(), networkManager.getIsHost());
    }
  }

  // Draw FPS
  renderer.drawFPS(currentFps);

  // Apply post-processing effects
  renderer.applyPostProcessing();

  // End frame
  renderer.endFrame();

  // Continue loop
  requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame((timestamp) => {
  lastTime = timestamp;
  gameLoop(timestamp);
});
