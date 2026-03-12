// World dimensions
export const MAP_HALF  = 33.2;   // player clamp boundary, a little inset from walls

// Player
export const PLAYER_HEIGHT = 1.7;   // eye height in world units
export const MOVE_SPEED    = 8.0;   // top walking speed (world units / second)
export const MOVE_ACCEL    = 13;    // how fast velocity ramps up to target speed
export const PLAYER_RADIUS = 0.42;  // collision capsule radius

// Head bob — subtle, only while actually moving
export const BOB_FREQ = 1.7;        // full cycles per second at full speed
export const BOB_AMP  = 0.045;      // vertical amplitude in world units

// Dinosaur discovery
export const DINO_COUNT        = 5;
export const DINO_TRIGGER_DIST = 3.5;   // proximity to trigger a find
export const DINO_BLOCK_RADIUS = 0.75;  // how close you can walk to a dino body
export const DINO_SCALE        = 0.9;   // applied to dino.glb

// Proximity hint — shown when player is "getting warmer"
export const PROXIMITY_HINT_DIST = 10.0;   // world units

// Glowing orb effect (wow feature)
// Raised higher so the orb sits clearly above the dino, not through its head.
export const ORB_BOB_SPEED = 2.0;
export const ORB_BOB_AMP   = 0.16;   // tighter so it stays above the model
export const ORB_BASE_Y    = 3.6;    // well above a standing dino

// Minimap overlay
export const MINIMAP_SIZE = 160;    // canvas pixel size (square)
