import { InputAction, PlayerInput } from './types';

const INPUT_BUFFER_SIZE = 15;

export interface InputManagerState {
  buffer: PlayerInput[];
  currentFrame: number;
  heldActions: Set<InputAction>;
}

export function createInputManager(): InputManagerState {
  return {
    buffer: [],
    currentFrame: 0,
    heldActions: new Set(),
  };
}

/** Record a new input at the current frame */
export function recordInput(
  mgr: InputManagerState,
  actions: InputAction[],
  playerId: string
): PlayerInput {
  const input: PlayerInput = {
    frame: mgr.currentFrame,
    playerId,
    actions,
  };

  mgr.buffer.push(input);
  if (mgr.buffer.length > INPUT_BUFFER_SIZE) {
    mgr.buffer.shift();
  }

  // Track held state
  mgr.heldActions.clear();
  for (const a of actions) {
    mgr.heldActions.add(a);
  }

  return input;
}

/** Advance frame counter */
export function advanceFrame(mgr: InputManagerState): void {
  mgr.currentFrame++;
}

/** Check if an action is currently held */
export function isHeld(mgr: InputManagerState, action: InputAction): boolean {
  return mgr.heldActions.has(action);
}

/** Check if action was just pressed this frame (in latest buffer entry) */
export function justPressed(mgr: InputManagerState, action: InputAction): boolean {
  if (mgr.buffer.length === 0) return false;
  const latest = mgr.buffer[mgr.buffer.length - 1];
  if (latest.frame !== mgr.currentFrame) return false;
  return latest.actions.includes(action);
}

/** Map touch input data to InputActions */
export function mapTouchToActions(touchData: {
  joystickX: number;    // -1 to 1
  joystickY: number;    // -1 to 1
  attack: boolean;
  block: boolean;
  special1: boolean;
  special2: boolean;
  special3: boolean;
  special4: boolean;
  ultimate: boolean;
}): InputAction[] {
  const actions: InputAction[] = [];

  // D-pad / Joystick
  if (touchData.joystickX < -0.3) actions.push(InputAction.Left);
  if (touchData.joystickX > 0.3) actions.push(InputAction.Right);
  if (touchData.joystickY < -0.5) actions.push(InputAction.Jump);
  if (touchData.joystickY > 0.5) actions.push(InputAction.Crouch);

  // Buttons
  if (touchData.attack) actions.push(InputAction.Attack);
  if (touchData.block) actions.push(InputAction.Block);
  if (touchData.special1) actions.push(InputAction.Special1);
  if (touchData.special2) actions.push(InputAction.Special2);
  if (touchData.special3) actions.push(InputAction.Special3);
  if (touchData.special4) actions.push(InputAction.Special4);
  if (touchData.ultimate) actions.push(InputAction.Ultimate);

  return actions;
}

/** Reset input manager for new round */
export function resetInput(mgr: InputManagerState): void {
  mgr.buffer = [];
  mgr.heldActions.clear();
}
