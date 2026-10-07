import { Fuel, Utensils, BedDouble, DoorOpen, Coffee, Wrench, Cross, ParkingSquare, ShoppingBag, Camera } from "lucide-react";
import type { PlaceCategory } from "@/types";

export const NEARBY_CATEGORY_META: Record<PlaceCategory, { label: string; icon: typeof Fuel; color: string }> = {
  fuel: { label: "Fuel", icon: Fuel, color: "#ff3b30" },
  food: { label: "Food", icon: Utensils, color: "#ffb627" },
  coffee: { label: "Coffee", icon: Coffee, color: "#d4a574" },
  hotel: { label: "Hotels", icon: BedDouble, color: "#8a7cff" },
  restroom: { label: "Restrooms", icon: DoorOpen, color: "#2dd4bf" },
  mechanic: { label: "Mechanics", icon: Wrench, color: "#c9c9c9" },
  hospital: { label: "Hospitals", icon: Cross, color: "#ff5a4f" },
  parking: { label: "Parking", icon: ParkingSquare, color: "#4da3ff" },
  shop: { label: "Shops", icon: ShoppingBag, color: "#e8e8e8" },
  scenic: { label: "Scenic", icon: Camera, color: "#34d399" },
};

export const NEARBY_CATEGORY_ORDER: PlaceCategory[] = [
  "fuel",
  "food",
  "coffee",
  "hotel",
  "restroom",
  "mechanic",
  "hospital",
  "parking",
  "shop",
  "scenic",
];
