import type { Place } from "@/types";

// Mock nearby-places dataset covering every category Stage 1 needs.
// Stage 2+ will swap this for a real Places API call keyed by
// the rider's live location and route.
export const mockPlaces: Place[] = [
  { id: "p-1", name: "HP Highway Fuel Point", category: "fuel", distanceKm: 1.2, etaMin: 3, rating: 4.3, address: "NH 48, Nelamangala", openNow: true, tags: ["24 hrs", "Air check"] },
  { id: "p-2", name: "Shell Express Bunk", category: "fuel", distanceKm: 4.8, etaMin: 9, rating: 4.1, address: "Tumkur Road", openNow: true, tags: ["Premium fuel"] },
  { id: "p-3", name: "Dhaba Junction", category: "food", distanceKm: 2.1, etaMin: 5, rating: 4.5, address: "Old Highway Rd", openNow: true, priceLevel: 1, tags: ["North Indian", "Parking"] },
  { id: "p-4", name: "Riders' Kitchen", category: "food", distanceKm: 6.3, etaMin: 12, rating: 4.6, address: "Bypass Road", openNow: true, priceLevel: 2, tags: ["Multi-cuisine"] },
  { id: "p-5", name: "Highway Pearl Hotel", category: "hotel", distanceKm: 8.5, etaMin: 15, rating: 4.2, address: "NH 48", openNow: true, priceLevel: 2, tags: ["Free parking", "Rest rooms"] },
  { id: "p-6", name: "Milestone Inn", category: "hotel", distanceKm: 12.4, etaMin: 20, rating: 3.9, address: "Toll Plaza Rd", openNow: true, priceLevel: 1, tags: ["Budget"] },
  { id: "p-7", name: "Public Restroom — HP Bunk", category: "restroom", distanceKm: 1.2, etaMin: 3, rating: 3.7, address: "NH 48", openNow: true, tags: ["Clean", "Free"] },
  { id: "p-8", name: "Highway Rest Point", category: "restroom", distanceKm: 5.6, etaMin: 10, rating: 3.5, address: "Bypass Road", openNow: true, tags: ["Paid"] },
  { id: "p-9", name: "Chai Point Junction", category: "coffee", distanceKm: 0.8, etaMin: 2, rating: 4.4, address: "NH 48 Service Rd", openNow: true, priceLevel: 1, tags: ["Filter coffee", "Snacks"] },
  { id: "p-10", name: "Cafe Kaapi", category: "coffee", distanceKm: 3.4, etaMin: 7, rating: 4.2, address: "Ring Road", openNow: true, priceLevel: 1, tags: ["Seating"] },
  { id: "p-11", name: "Speed Motor Works", category: "mechanic", distanceKm: 3.9, etaMin: 8, rating: 4.0, address: "Industrial Layout", openNow: true, tags: ["Puncture", "All brands"] },
  { id: "p-12", name: "Highway Bike Care", category: "mechanic", distanceKm: 7.2, etaMin: 13, rating: 4.3, address: "NH 48", openNow: false, tags: ["Towing"] },
  { id: "p-13", name: "City General Hospital", category: "hospital", distanceKm: 5.0, etaMin: 10, rating: 4.1, address: "Main Road", openNow: true, tags: ["24 hrs", "Emergency"] },
  { id: "p-14", name: "Apex Multispecialty", category: "hospital", distanceKm: 9.8, etaMin: 18, rating: 4.5, address: "Bypass Junction", openNow: true, tags: ["Trauma care"] },
  { id: "p-15", name: "Highway Parking Yard", category: "parking", distanceKm: 1.9, etaMin: 4, rating: 3.8, address: "NH 48", openNow: true, priceLevel: 1, tags: ["Guarded", "Two-wheeler"] },
  { id: "p-16", name: "Riders Park & Rest", category: "parking", distanceKm: 4.2, etaMin: 8, rating: 4.0, address: "Toll Plaza Rd", openNow: true, tags: ["Shaded"] },
];
