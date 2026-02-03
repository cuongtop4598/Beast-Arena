import { FighterState, Vector2D, GAME_CONFIG } from './types';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  shakeIntensity: number;
  shakeDuration: number;
  shakeDecay: number;
  slowMo: number; // 1.0 = normal, 0.3 = slow
  slowMoDuration: number;
}

export function createCamera(): CameraState {
  return {
    x: GAME_CONFIG.stageWidth / 2,
    y: GAME_CONFIG.stageHeight / 2,
    zoom: 1.0,
    shakeIntensity: 0,
    shakeDuration: 0,
    shakeDecay: 0.9,
    slowMo: 1.0,
    slowMoDuration: 0,
  };
}

/** Update camera to track both fighters */
export function updateCamera(
  camera: CameraState,
  f1: FighterState,
  f2: FighterState
): void {
  // Center between both fighters
  const targetX = (f1.position.x + f2.position.x) / 2;
  const targetY = Math.min(f1.position.y, f2.position.y) - 100;

  // Smooth follow (lerp)
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.05;

  // Zoom based on distance
  const dist = Math.abs(f1.position.x - f2.position.x);
  const targetZoom = Math.max(0.7, Math.min(1.2, 800 / Math.max(dist, 200)));
  camera.zoom += (targetZoom - camera.zoom) * 0.05;

  // Screen shake decay
  if (camera.shakeDuration > 0) {
    camera.shakeDuration--;
    camera.shakeIntensity *= camera.shakeDecay;
  } else {
    camera.shakeIntensity = 0;
  }

  // Slow-mo decay
  if (camera.slowMoDuration > 0) {
    camera.slowMoDuration--;
  } else {
    camera.slowMo += (1.0 - camera.slowMo) * 0.1;
  }
}

/** Trigger screen shake */
export function triggerShake(
  camera: CameraState,
  intensity: number,
  durationFrames: number
): void {
  camera.shakeIntensity = intensity;
  camera.shakeDuration = durationFrames;
}

/** Trigger slow-mo for ultimates / heavy hits */
export function triggerSlowMo(
  camera: CameraState,
  factor: number,
  durationFrames: number
): void {
  camera.slowMo = factor;
  camera.slowMoDuration = durationFrames;
}

/** Get shake offset for rendering */
export function getShakeOffset(camera: CameraState): Vector2D {
  if (camera.shakeIntensity <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * camera.shakeIntensity * 2,
    y: (Math.random() - 0.5) * camera.shakeIntensity * 2,
  };
}
