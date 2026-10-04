import type { PlaceCategory } from "@/types";

// Real-places category metadata (Geoapify-backed). Emoji icons match the
// exact set requested for the Nearby grid.
export const NEARBY_CATEGORY_META: Record<PlaceCategory, { label: string; emoji: string }> = {
  fuel: { label: "Fuel", emoji: "⛽" },
  hotel: { label: "Hotels", emoji: "🏨" },
  food: { label: "Food", emoji: "🍴" },
  coffee: { label: "Cafes", emoji: "☕" },
  mechanic: { label: "Mechanic", emoji: "🔧" },
  hospital: { label: "Hospital", emoji: "🏥" },
  parking: { label: "Parking", emoji: "🅿️" },
  restroom: { label: "Restroom", emoji: "🚻" },
  shop: { label: "Shops", emoji: "🏪" },
};

export const NEARBY_CATEGORY_ORDER: PlaceCategory[] = [
  "fuel",
  "hotel",
  "food",
  "coffee",
  "mechanic",
  "hospital",
  "parking",
  "restroom",
  "shop",
];
