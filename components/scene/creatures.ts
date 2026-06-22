/**
 * Model definitions for the marine life. Paths point at the user-supplied FBX +
 * texture sets under /public/models. Tuning fields (size / orientation / wander)
 * are here so behaviour can be tweaked without touching component code.
 */

/** A fish used as an instanced school (static mesh; boids do the swimming). */
export type FishModel = {
  fbx: string;
  map: string;
  normal: string;
  /** Longest-axis length in world units for one fish. */
  targetLen: number;
  /** Flip head↔tail if the model ends up swimming backwards. */
  flip?: boolean;
  /** Extra rotation (radians) baked into the mesh to fix roll/upside-down. */
  upright?: [number, number, number];
};

export const JUVENILE_FISH: FishModel = {
  fbx: "/models/juvenileFish/juvenileFish.fbx",
  map: "/models/juvenileFish/juvenileFish_Diffuse.jpg",
  normal: "/models/juvenileFish/juvenileFish_Normal.jpg",
  targetLen: 0.55,
  flip: false,
};

export const SCAD_FISH: FishModel = {
  fbx: "/models/ScadFish/scadFish.fbx",
  map: "/models/ScadFish/scadFish_Diffuse.jpg",
  normal: "/models/ScadFish/scadFish_Normal.jpg",
  targetLen: 0.7,
  flip: false,
};

/** A large animated creature (turtle / dugong) that plays a baked clip and
 *  wanders the meadow. */
export type CreatureModel = {
  fbx: string;
  map: string;
  normal: string;
  /** Longest-axis size in world units. */
  targetSize: number;
  /** Cruise speed (world units / s). */
  speed: number;
  /** How fast it turns toward its current heading target (per second). */
  turnRate: number;
  /** Max random heading change each wander step (radians). */
  turnAmount: number;
  /** Seconds between picking a new heading / depth. */
  wanderInterval: number;
  /** Vertical band it roams within (world Y). */
  yMin: number;
  yMax: number;
  /** Horizontal roam radius from the meadow centre. */
  bound: number;
  /** Base rotation to orient the model upright (radians). */
  upright: [number, number, number];
  /** Yaw added so the model's nose points along its heading (radians). */
  yawOffset: number;
};

export const TURTLE: CreatureModel = {
  fbx: "/models/Turtle/Loggerhead.fbx",
  map: "/models/Turtle/loggerhead_diffuse.jpg",
  normal: "/models/Turtle/loggerhead_normal.jpg",
  targetSize: 1.6,
  speed: 1.3,
  turnRate: 0.8,
  turnAmount: 1.0,
  wanderInterval: 3.5,
  yMin: 1.6,
  yMax: 6.0,
  bound: 70,
  upright: [0, 0, 0],
  yawOffset: 0,
};

export const DUGONG: CreatureModel = {
  fbx: "/models/Dugong/dugongAnimated.fbx",
  map: "/models/Dugong/Dugong_diffuse.jpg",
  normal: "/models/Dugong/Dugong_normals.jpg",
  targetSize: 3.4,
  speed: 1.0,
  turnRate: 0.6,
  turnAmount: 0.8,
  wanderInterval: 4.5,
  yMin: 1.3,
  yMax: 4.0,
  bound: 70,
  upright: [0, 0, 0],
  yawOffset: 0,
};
