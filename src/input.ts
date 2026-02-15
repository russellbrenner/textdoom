import type { InputState, WeaponState, Player, PlayerId } from './types';
import { switchWeaponByNumber, switchToNextWeapon, switchToPrevWeapon } from './weapon';

/**
 * Input handler for keyboard and mouse controls
 * Supports two players for split-screen multiplayer
 * Player 1: WASD + Space to fire, 1-4 for weapons
 * Player 2: Arrow keys + Enter to fire, 7-0 for weapons
 */
export class InputHandler {
  private state1: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
    fire: false,
  };

  private state2: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
    fire: false,
  };

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;

  // Weapon switching callbacks
  private weapon1: WeaponState | null = null;
  private player1: Player | null = null;
  private weapon2: WeaponState | null = null;
  private player2: Player | null = null;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('wheel', this.onWheelBound, { passive: false });
  }

  /**
   * Set weapon and player for weapon switching (legacy single player)
   */
  setWeaponContext(weapon: WeaponState, player: Player): void {
    this.weapon1 = weapon;
    this.player1 = player;
  }

  /**
   * Set weapon and player contexts for both players
   */
  setMultiplayerContext(
    weapon1: WeaponState, player1: Player,
    weapon2: WeaponState, player2: Player
  ): void {
    this.weapon1 = weapon1;
    this.player1 = player1;
    this.weapon2 = weapon2;
    this.player2 = player2;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.updateKey(e.code, true);

    // Handle weapon switching for Player 1 (1-9, 0, - keys for all weapons)
    if (this.weapon1 && this.player1) {
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const num = parseInt(e.code.slice(-1));
        switchWeaponByNumber(this.weapon1, num, this.player1);
      } else if (e.code === 'Digit0') {
        switchWeaponByNumber(this.weapon1, 10, this.player1);
      } else if (e.code === 'Minus') {
        switchWeaponByNumber(this.weapon1, 11, this.player1);
      }
    }

    // Handle weapon switching for Player 2 (F-keys for weapons)
    if (this.weapon2 && this.player2) {
      // F1-F11 for Player 2's weapons (avoids conflict with P1's number keys)
      if (e.code === 'F1') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 1, this.player2); }
      if (e.code === 'F2') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 2, this.player2); }
      if (e.code === 'F3') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 3, this.player2); }
      if (e.code === 'F4') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 4, this.player2); }
      if (e.code === 'F5') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 5, this.player2); }
      if (e.code === 'F6') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 6, this.player2); }
      if (e.code === 'F7') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 7, this.player2); }
      if (e.code === 'F8') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 8, this.player2); }
      if (e.code === 'F9') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 9, this.player2); }
      if (e.code === 'F10') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 10, this.player2); }
      if (e.code === 'F11') { e.preventDefault(); switchWeaponByNumber(this.weapon2, 11, this.player2); }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.updateKey(e.code, false);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left click - Player 1 fires
      this.state1.fire = true;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.state1.fire = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    // Mouse wheel for Player 1
    if (this.weapon1 && this.player1) {
      if (e.deltaY < 0) {
        switchToPrevWeapon(this.weapon1, this.player1);
      } else if (e.deltaY > 0) {
        switchToNextWeapon(this.weapon1, this.player1);
      }
    }
  }

  private updateKey(code: string, pressed: boolean): void {
    // === PLAYER 1: WASD + Q/E for strafe, Space to fire ===
    switch (code) {
      case 'KeyW':
        this.state1.forward = pressed;
        break;
      case 'KeyS':
        this.state1.backward = pressed;
        break;
      case 'KeyA':
        this.state1.left = pressed;
        break;
      case 'KeyD':
        this.state1.right = pressed;
        break;
      case 'KeyQ':
        this.state1.strafeLeft = pressed;
        break;
      case 'KeyE':
        this.state1.strafeRight = pressed;
        break;
      case 'Space':
        this.state1.fire = pressed;
        break;
    }

    // === PLAYER 2: Arrow keys + comma/period for strafe, Enter to fire ===
    switch (code) {
      case 'ArrowUp':
        this.state2.forward = pressed;
        break;
      case 'ArrowDown':
        this.state2.backward = pressed;
        break;
      case 'ArrowLeft':
        this.state2.left = pressed;
        break;
      case 'ArrowRight':
        this.state2.right = pressed;
        break;
      case 'Comma':
        this.state2.strafeLeft = pressed;
        break;
      case 'Period':
        this.state2.strafeRight = pressed;
        break;
      case 'Enter':
        this.state2.fire = pressed;
        break;
    }
  }

  getState(playerId: PlayerId = 1): InputState {
    if (playerId === 2) {
      return { ...this.state2 };
    }
    return { ...this.state1 };
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('wheel', this.onWheelBound);
  }
}
