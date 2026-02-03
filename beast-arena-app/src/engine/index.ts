// Beast Arena Game Engine
export { GameEngine } from './GameLoop';
export * from './types';
export * from './Fighter';
export * from './Physics';
export * from './Camera';
export * from './SupplyDrop';
export * from './InputManager';

// Phase 2: UX Feedback System
export { FeedbackManager } from './FeedbackManager';
export type { FeedbackEvent, FeedbackEventType } from './FeedbackManager';
export { HapticFeedback } from './HapticFeedback';
export { ScreenShake, SHAKE_PRESETS } from './ScreenShake';
export { HitStop, HITSTOP_PRESETS } from './HitStop';
export { SlowMotion } from './SlowMotion';
export { useAnnouncer, ANNOUNCEMENT_PRESETS } from './AnnouncerSystem';
export { ComboTracker } from './ComboTracker';
export type { ComboState } from './ComboTracker';

// Phase 5: Audio & Announcer
export { audioManager } from './AudioManager';
export type { SFXName, BGMName, UISound } from './AudioManager';
export { useAnnouncerManager, ANNOUNCER_PRESETS } from './AnnouncerManager';
export type { AnnouncerAnimation, AnnouncerPreset, ActiveAnnouncement } from './AnnouncerManager';
