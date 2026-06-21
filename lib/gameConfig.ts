/**
 * Gameplay tuning constants for the basket-planting loop. Edit these to balance
 * pacing without digging through component code.
 */

/** Baskets the player can place before they have to wait out a cooldown. */
export const BASKET_BATCH = 3;

/** Seconds the player must wait, once a batch is spent, before it refills. */
export const BASKET_COOLDOWN = 15;

/** Seconds a basket (and the seagrass grown on it) stays before it disappears. */
export const BASKET_LIFETIME = 30;

/** Seconds the fade-out animation runs before the objects are removed. */
export const FADE_OUT_DUR = 1.0;

// --- environment health ---

/** Seagrass in the starting (damaged) meadow — the live count at 0 baskets. */
export const STARTING_SEAGRASS = 5;

/** Seagrass grown around each placed basket. */
export const SEAGRASS_PER_BASKET = 5;

/** Total live seagrass needed for the environment to reach 100% health. */
export const SEAGRASS_FOR_FULL = 40;

// --- marine life return thresholds (environment health, 0–1) ---
// Each creature reappears once health crosses its threshold.

/** First fish school — drifts to stay ahead of the camera. */
export const FISH_SCHOOL_HEALTH = 0.5;

/** Second fish school — roams the surroundings, centred on the player. */
export const FISH_SCHOOL_2_HEALTH = 0.7;

/** Turtle (model TBD). */
export const TURTLE_HEALTH = 0.85;

/** Dugong (model TBD). */
export const DUGONG_HEALTH = 1.0;
