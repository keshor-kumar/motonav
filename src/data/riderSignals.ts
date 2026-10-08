// Common motorcycle / group-riding hand signals for the in-app guide.
//
// These are COMMON signals, not universal or official ones: they vary by country, riding
// school and group. Only signals with a widely documented meaning are included; where no
// standard exists (emergencies) the card says so instead of inventing one.

export type SignalCategoryId = "speed" | "direction" | "hazards" | "group" | "needs" | "emergency";

export type PoseId =
  | "slow-down"
  | "stop"
  | "speed-up"
  | "left-turn"
  | "right-turn"
  | "follow-me"
  | "pull-over"
  | "hazard-left"
  | "hazard-right"
  | "hazard-road"
  | "single-file"
  | "staggered"
  | "acknowledge"
  | "fuel"
  | "water-rest"
  | "emergency"
  | "medical";

export interface SignalCategory {
  id: SignalCategoryId;
  label: string;
}

export interface RiderSignal {
  id: string;
  category: SignalCategoryId;
  name: string;
  pose: PoseId;
  meaning: string;
  whenToUse: string;
  safety: string;
  /** How riders commonly make the signal, incl. regional variants. */
  commonForm: string;
  /** A common group-riding signal (leader/formation) rather than a general one. */
  groupSignal?: boolean;
  /** No widely accepted rider signal exists — the card says so. */
  noStandard?: boolean;
}

export const SIGNAL_CATEGORIES: SignalCategory[] = [
  { id: "speed", label: "Speed & stopping" },
  { id: "direction", label: "Direction & movement" },
  { id: "hazards", label: "Hazards" },
  { id: "group", label: "Group coordination" },
  { id: "needs", label: "Rider / bike needs" },
  { id: "emergency", label: "Emergency" },
];

export const RIDER_SIGNALS: RiderSignal[] = [
  {
    id: "slow-down",
    category: "speed",
    name: "Slow down",
    pose: "slow-down",
    meaning: "Tell the riders behind you to reduce speed.",
    whenToUse: "Approaching a slower section, a hazard, a turn or traffic — anywhere the group should ease off.",
    safety: "Use the signal early and keep control of the motorcycle.",
    commonForm: "Left arm extended out and slightly low, palm down, patting gently up and down.",
  },
  {
    id: "stop",
    category: "speed",
    name: "Stop",
    pose: "stop",
    meaning: "Tell the riders behind you that you are about to stop.",
    whenToUse: "Before pulling over or stopping for a hazard, junction or break.",
    safety: "Slow smoothly, check your mirrors and brake early so the rider behind has time to react.",
    commonForm: "Left arm extended downward with the palm facing back.",
  },
  {
    id: "speed-up",
    category: "speed",
    name: "Speed up",
    pose: "speed-up",
    meaning: "Ask the riders behind you to pick up the pace.",
    whenToUse: "When the group has spread out below a safe, legal speed — for example to close a gap after a junction.",
    safety: "Never exceed the speed limit or your own comfort because of a signal.",
    commonForm: "Left arm extended out and up, palm up, lifting upward.",
  },
  {
    id: "left-turn",
    category: "direction",
    name: "Left turn",
    pose: "left-turn",
    meaning: "You are about to turn left.",
    whenToUse: "Before turning left, to reinforce your indicator, especially if it is hard to see.",
    safety: "Signal early, then return your hand to the bar before you brake and turn.",
    commonForm: "Left arm extended straight out.",
  },
  {
    id: "right-turn",
    category: "direction",
    name: "Right turn",
    pose: "right-turn",
    meaning: "You are about to turn right.",
    whenToUse: "Before turning right, to reinforce your indicator.",
    safety: "Signal early and put your hand back on the bar before turning. Agree one style with your group.",
    commonForm: "Left arm bent upward at the elbow. Some riders extend the right arm straight out instead.",
  },
  {
    id: "follow-me",
    category: "direction",
    name: "Follow me",
    pose: "follow-me",
    meaning: "Ask the riders behind you to follow you.",
    whenToUse: "Leading the group away from a stop or onto a new road.",
    safety: "Keep your formation and avoid sudden moves just to be seen.",
    commonForm: "Arm raised straight up, sometimes with a small forward wave.",
    groupSignal: true,
  },
  {
    id: "pull-over",
    category: "direction",
    name: "Pull over",
    pose: "pull-over",
    meaning: "You want the group to move to the side of the road and stop.",
    whenToUse: "To stop the group for a break, a check or a regroup, somewhere safe.",
    safety: "Choose a safe, legal spot with good visibility and indicate early.",
    commonForm: "Point toward the side of the road where you intend to stop.",
    groupSignal: true,
  },
  {
    id: "hazard-left",
    category: "hazards",
    name: "Hazard on the left",
    pose: "hazard-left",
    meaning: "Warn the riders behind you of a hazard on the left side of the road.",
    whenToUse: "Debris, potholes, gravel, animals or parked vehicles on the left.",
    safety: "Point only as long as needed, then both hands back on the bars. Pass with a safe margin.",
    commonForm: "Point down toward the hazard with the left hand. Some riders also extend the left foot.",
  },
  {
    id: "hazard-right",
    category: "hazards",
    name: "Hazard on the right",
    pose: "hazard-right",
    meaning: "Warn the riders behind you of a hazard on the right side of the road.",
    whenToUse: "Debris, potholes, gravel, animals or parked vehicles on the right.",
    safety: "Keep the signal brief and keep control — the right hand also operates the throttle and front brake.",
    commonForm: "Point toward the hazard with the right hand, or extend the right foot.",
  },
  {
    id: "hazard-road",
    category: "hazards",
    name: "Obstacle ahead",
    pose: "hazard-road",
    meaning: "There is a hazard in your lane or on the road ahead.",
    whenToUse: "Debris, oil, potholes or stopped traffic ahead of the group.",
    safety: "Keep scanning the road. A brief point is enough; never lose control of the bike to signal.",
    commonForm: "Point at the hazard, then toward the side you intend to pass.",
  },
  {
    id: "single-file",
    category: "group",
    name: "Single file",
    pose: "single-file",
    meaning: "Riders should form a single line.",
    whenToUse: "Narrow roads, tight bends, heavy traffic or poor visibility.",
    safety: "Move into position smoothly and keep a safe following distance.",
    commonForm: "One finger raised.",
    groupSignal: true,
  },
  {
    id: "staggered",
    category: "group",
    name: "Staggered formation",
    pose: "staggered",
    meaning: "Riders may return to a staggered formation.",
    whenToUse: "Open roads with enough room, such as after a narrow section.",
    safety: "Keep your lane position and spacing; never ride directly beside another rider.",
    commonForm: "Two fingers raised.",
    groupSignal: true,
  },
  {
    id: "acknowledge",
    category: "group",
    name: "Acknowledge",
    pose: "acknowledge",
    meaning: "Show you have seen and understood a signal.",
    whenToUse: "After the leader or another rider signals you.",
    safety: "Keep it brief and keep your eyes on the road.",
    commonForm: "A thumbs-up or a small wave.",
    groupSignal: true,
  },
  {
    id: "fuel",
    category: "needs",
    name: "Fuel needed",
    pose: "fuel",
    meaning: "You need to refuel soon.",
    whenToUse: "When you are running low and want a fuel stop planned.",
    safety: "Say so early rather than riding on empty, and keep hand-off-bar time short.",
    commonForm: "Point at the fuel tank.",
  },
  {
    id: "water-rest",
    category: "needs",
    name: "Water / rest stop",
    pose: "water-rest",
    meaning: "You would like a drink, some food or a break.",
    whenToUse: "When you are thirsty, hungry or tired. Stopping beats riding fatigued.",
    safety: "Fatigue slows your reactions — ask for the break early.",
    commonForm: "A drinking motion toward the mouth.",
  },
  {
    id: "emergency",
    category: "emergency",
    name: "Urgent help needed",
    pose: "emergency",
    meaning: "You or another rider needs immediate help.",
    whenToUse: "A serious problem. Stop safely if you can, switch on your hazard lights and call emergency services.",
    safety: "Waving both arms is not a controlled riding position — only do it when stopped or already slowing safely.",
    commonForm: "No standard rider signal exists for this. Agree your own with your group before the ride.",
    noStandard: true,
  },
  {
    id: "medical",
    category: "emergency",
    name: "Accident / medical help",
    pose: "medical",
    meaning: "Someone has been hurt.",
    whenToUse: "After an accident or when a rider needs medical attention.",
    safety: "Stop only where it is safe, protect the scene, call local emergency services (112 in many countries) and send an Emergency message in Ride Comms.",
    commonForm: "No standard hand signal exists — use your voice, Ride Comms and a phone call.",
    noStandard: true,
  },
];
