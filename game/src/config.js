// Velvet Heist — shared constants for the whole game.
// One clear job: every number the other modules agree on lives here.
export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const COLS = 32;
export const ROWS = 20;

// Movement (pixels per second).
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 82;
export const GUARD_SPEED = 78;
export const GUARD_CHASE_SPEED = 148;

// Vision.
export const GUARD_RANGE = 235;
export const GUARD_FOV = (Math.PI * 78) / 180; // ~78 degrees
export const CAMERA_RANGE = 260;
export const CAMERA_FOV = (Math.PI * 62) / 180;
export const SHADOW_RANGE_FACTOR = 0.45; // detection range inside shadow tiles
export const SNEAK_RANGE_FACTOR = 0.7; // detection range while sneaking

// Alarm meter 0..100.
export const ALARM_DECAY = 1.6; // per second while unseen
export const ALARM_CAMERA_RATE = 55; // per second while a camera sees the thief
export const ALARM_LOCKDOWN = 100;
export const LOCKDOWN_SECONDS = 18;

// Detection: suspicion 0..1 fills while seen, drains while hidden.
export const SUSPICION_FILL = 1.6; // per second, fully seen at close range
export const SUSPICION_DRAIN = 0.55;

// Noise.
export const NOISE_WALK_RADIUS = 130;
export const NOISE_SNEAK_RADIUS = 45;
export const NOISE_SAFE_RADIUS = 190;
export const NOISE_COIN_RADIUS = 220;

// Tools.
export const TOOL_COIN = 'coin';
export const TOOL_SMOKE = 'smoke';
export const TOOL_PICK = 'pick';
export const PRICES = { coin: 25, smoke: 80, pick: 60 };
export const SMOKE_SECONDS = 6;
export const SAFE_CRACK_SECONDS = 3;
export const SAFE_CRACK_PICK_SECONDS = 1.4;
export const HACK_SECONDS = 2.2;
export const CAMERA_OFF_SECONDS = 25;

// Loot values in dollars.
export const LOOT_VALUES = { painting: 150, gem: 250, safe: 500 };

// Colours — night-gallery palette: deep indigo, brass gold, alarm red.
export const PALETTE = {
  floor: '#232742',
  floorAlt: '#20243c',
  carpet: '#5d2f45',
  carpetAlt: '#552a40',
  shadow: '#161a30',
  wall: '#3a4066',
  wallTop: '#565e8f',
  gold: '#f2c14e',
  goldDim: '#b98f2e',
  red: '#ff4d5e',
  redDim: '#a12736',
  cone: 'rgba(242, 193, 78, 0.20)',
  coneHot: 'rgba(255, 77, 94, 0.30)',
  camCone: 'rgba(94, 200, 255, 0.18)',
  thief: '#7fe7c4',
  guard: '#ff9d5c',
  text: '#f4ead2',
  muted: '#9aa3c7',
  panel: 'rgba(10, 12, 26, 0.82)',
};
