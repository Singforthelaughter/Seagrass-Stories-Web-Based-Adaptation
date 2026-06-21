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
