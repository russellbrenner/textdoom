import type { InputState } from './types';

/**
 * Input handler for keyboard controls
 * Tracks current state of movement keys
 */
export class InputHandler {
  private state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.updateKey(e.code, true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.updateKey(e.code, false);
  }

  private updateKey(code: string, pressed: boolean): void {
    switch (code) {
      // Forward
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = pressed;
        break;

      // Backward
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = pressed;
        break;

      // Rotate left
      case 'ArrowLeft':
        this.state.left = pressed;
        break;

      // Rotate right
      case 'ArrowRight':
        this.state.right = pressed;
        break;

      // Strafe left
      case 'KeyA':
        this.state.strafeLeft = pressed;
        break;

      // Strafe right
      case 'KeyD':
        this.state.strafeRight = pressed;
        break;
    }
  }

  getState(): InputState {
    return { ...this.state };
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
