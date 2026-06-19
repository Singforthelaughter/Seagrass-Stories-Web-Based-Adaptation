/**
 * Smootherstep (Ken Perlin) easing on [0,1] — zero velocity AND acceleration
 * at both ends. Shared so the dive-in transition (camera, diver, seafloor)
 * all animate on exactly the same curve.
 */
export const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
