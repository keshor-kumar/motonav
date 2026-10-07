export interface WarmupExercise {
  id: string;
  name: string;
  instructions: string;
  durationSeconds: number;
}

// Simple, beginner-friendly, no-equipment stretches. General warm-up only —
// not medical advice (see the disclaimer shown throughout WarmupScreen).
export const WARMUP_EXERCISES: WarmupExercise[] = [
  { id: "neck", name: "Neck rotation", instructions: "Gently turn your head left and right, then slowly roll it in a circle.", durationSeconds: 30 },
  { id: "shoulders", name: "Shoulder rolls", instructions: "Roll both shoulders forward in big circles, then reverse direction.", durationSeconds: 30 },
  { id: "wrists", name: "Wrist rotations", instructions: "Extend your arms and gently rotate your wrists in both directions.", durationSeconds: 20 },
  { id: "torso", name: "Torso rotation", instructions: "Hands on hips, gently twist your upper body left and right.", durationSeconds: 30 },
  { id: "legs", name: "Leg / hip stretch", instructions: "Hold onto something stable and gently swing one leg forward and back, then switch.", durationSeconds: 30 },
  { id: "ankles", name: "Ankle rotation", instructions: "Lift one foot slightly and rotate your ankle in circles, then switch feet.", durationSeconds: 20 },
];
