import type { Coordinates } from "@/types";

// ============================================================
// Curated catalog of famous Indian motorcycle rides (static — no CMS, no admin).
//
// `waypoints` are real towns/passes along the usual road, in order, as [lat, lng]. They draw the
// preview line on cards and are the fallback line on the detail page. When the Geoapify key is set the
// detail page ALSO requests a real road route (same getRoute() the rest of the app uses) and shows
// its live distance/time next to the curated figures.
//
// Distances and times are approximate typical figures for planning, not turn-by-turn data.
// Mountain passes open and close with weather: always check current road status before you go.
// ============================================================

export type Difficulty = "Easy" | "Moderate" | "Hard";
export type LatLng = [number, number];

export interface FamousRoute {
  id: string;
  name: string;
  region: string;
  start: { name: string; coords: Coordinates };
  destination: { name: string; coords: Coordinates };
  waypoints: LatLng[];
  distanceKm: number;
  /** Riding time, not counting stops. */
  durationLabel: string;
  suggestedDays: string;
  difficulty: Difficulty;
  terrain: string[];
  bestSeason: string;
  description: string;
  highlights: string[];
  riderNotes: string[];
  /** Cover photo (bundled in /public/images). Swap for route-specific photos any time. */
  image: string;
}

const pt = (lat: number, lng: number): Coordinates => ({ lat, lng });

export const FAMOUS_ROUTES: FamousRoute[] = [
  {
    id: "chennai-ooty",
    name: "Chennai to Ooty",
    region: "Tamil Nadu",
    start: { name: "Chennai", coords: pt(13.0827, 80.2707) },
    destination: { name: "Ooty", coords: pt(11.4064, 76.6932) },
    waypoints: [[13.0827, 80.2707], [12.9165, 79.1325], [12.5186, 78.2137], [11.6643, 78.146], [11.341, 77.7172], [11.2991, 76.9382], [11.353, 76.7959], [11.4064, 76.6932]],
    distanceKm: 560,
    durationLabel: "10–11 h",
    suggestedDays: "1–2 days",
    difficulty: "Moderate",
    terrain: ["Highway", "Ghat road", "Hill climb"],
    bestSeason: "October – June",
    description: "A long, fast run west across the plains on national highways, finishing with the climb from Mettupalayam through the Nilgiri ghats into cool tea-country air.",
    highlights: ["Smooth four-lane highway through Vellore, Krishnagiri and Salem", "The Mettupalayam – Coonoor ghat climb with its hairpins", "Tea estates and eucalyptus forest around Coonoor and Ooty", "Cool-weather finish — carry a jacket liner"],
    riderNotes: ["Start before sunrise to reach the ghats in daylight.", "Fog and sudden rain are common on the climb — slow down on wet hairpins.", "Check fuel at Mettupalayam before the ghat section.", "Weekend and holiday traffic in Coonoor and Ooty can be heavy."],
    image: "/images/hero-forest-road.webp",
  },
  {
    id: "bengaluru-coorg",
    name: "Bengaluru to Coorg",
    region: "Karnataka",
    start: { name: "Bengaluru", coords: pt(12.9716, 77.5946) },
    destination: { name: "Madikeri (Coorg)", coords: pt(12.4244, 75.7382) },
    waypoints: [[12.9716, 77.5946], [12.7217, 77.281], [12.5223, 76.8974], [12.414, 76.6946], [12.3376, 76.098], [12.459, 75.956], [12.4244, 75.7382]],
    distanceKm: 250,
    durationLabel: "5–6 h",
    suggestedDays: "Weekend",
    difficulty: "Easy",
    terrain: ["Highway", "Hill road", "Coffee estates"],
    bestSeason: "October – March",
    description: "The classic Bengaluru weekend escape: fast highway out of the city, then rolling country roads into coffee-estate hills and the misty Kodagu plateau.",
    highlights: ["Easy highway start along the Mysuru road", "Cauvery river country near Srirangapatna", "Coffee and pepper estates approaching Kushalnagar", "Cool misty evenings at Madikeri"],
    riderNotes: ["Leave early on Friday or Saturday to beat out-of-city traffic.", "Roads near Madikeri can be slippery in the monsoon and prone to landslides.", "Watch for buses overtaking on the narrow stretches after Kushalnagar."],
    image: "/images/bare-trees.webp",
  },
  {
    id: "mumbai-goa",
    name: "Mumbai to Goa",
    region: "Maharashtra – Goa",
    start: { name: "Mumbai", coords: pt(19.076, 72.8777) },
    destination: { name: "Panaji (Goa)", coords: pt(15.4909, 73.8278) },
    waypoints: [[19.076, 72.8777], [18.9894, 73.1175], [18.0833, 73.4167], [17.5306, 73.516], [16.9902, 73.312], [16.0109, 73.6894], [15.4909, 73.8278]],
    distanceKm: 590,
    durationLabel: "11–12 h",
    suggestedDays: "1–2 days",
    difficulty: "Moderate",
    terrain: ["Coastal highway", "Ghat sections", "Town traffic"],
    bestSeason: "October – February",
    description: "The Konkan run down the west coast on NH66: long highway miles, river creeks, red-laterite hills and the first sea views as you near Goa.",
    highlights: ["Konkan coast scenery between Chiplun and Ratnagiri", "Kashedi and Bhoste ghat sections", "Beach stops around Ganpatipule and Tarkarli", "Arrive in Goa with time for a sunset"],
    riderNotes: ["Parts of NH66 have been under construction for years — expect diversions and rough patches.", "Avoid night riding on the Konkan stretches; trucks and cattle are common.", "Plan an overnight stop (Chiplun or Ratnagiri) rather than riding it in one go."],
    image: "/images/sunset-viewpoint.webp",
  },
  {
    id: "goa-gokarna",
    name: "Goa to Gokarna",
    region: "Goa – Karnataka",
    start: { name: "Panaji (Goa)", coords: pt(15.4909, 73.8278) },
    destination: { name: "Gokarna", coords: pt(14.5479, 74.3188) },
    waypoints: [[15.4909, 73.8278], [15.2993, 73.958], [15.0122, 74.0318], [14.8137, 74.129], [14.663, 74.303], [14.5479, 74.3188]],
    distanceKm: 160,
    durationLabel: "3.5–4 h",
    suggestedDays: "Day ride",
    difficulty: "Easy",
    terrain: ["Coastal road", "Highway", "Forest patches"],
    bestSeason: "October – March",
    description: "A relaxed coastal hop: south through Canacona, across the border at Karwar, and along green Uttara Kannada roads to Gokarna's beaches.",
    highlights: ["Quiet Goa–Karnataka border crossing", "Karwar's coast and Kali river bridge", "Palm-lined stretches near Ankola", "Beach sunset finish at Gokarna"],
    riderNotes: ["Easy enough for first long rides, but keep to daylight.", "Watch for speed breakers entering coastal towns.", "Carry cash — some small stops don't take cards."],
    image: "/images/sunset-viewpoint.webp",
  },
  {
    id: "manali-leh",
    name: "Manali to Leh",
    region: "Himachal Pradesh – Ladakh",
    start: { name: "Manali", coords: pt(32.2432, 77.1892) },
    destination: { name: "Leh", coords: pt(34.1526, 77.5771) },
    waypoints: [[32.2432, 77.1892], [32.4868, 77.1259], [32.57, 77.03], [32.64, 77.185], [32.9, 77.58], [33.15, 77.756], [33.519, 77.766], [33.833, 77.818], [34.1526, 77.5771]],
    distanceKm: 430,
    durationLabel: "12–14 h (usually 2 days)",
    suggestedDays: "2 days + acclimatisation",
    difficulty: "Hard",
    terrain: ["High-altitude passes", "Gravel & water crossings", "Remote desert"],
    bestSeason: "Mid June – mid September",
    description: "One of the world's great motorcycle roads: through the Atal Tunnel, over several passes above 4,800 m, across the high cold desert of Ladakh to Leh.",
    highlights: ["Atal Tunnel and the Lahaul valley", "Baralacha La, Nakee La, Lachung La and Tanglang La passes", "The vast Moray plains", "Stunning light and almost no traffic"],
    riderNotes: ["Altitude sickness is real: plan an acclimatisation stop, ascend gradually and don't push through symptoms.", "Water crossings and loose surface are common — fresh meltwater can rise by afternoon.", "Fuel is scarce between Keylong and Upshi: carry spare fuel.", "Check road status and permits before leaving; sections close with snow or landslides."],
    image: "/images/mist-monochrome.webp",
  },
  {
    id: "srinagar-leh",
    name: "Srinagar to Leh",
    region: "Jammu & Kashmir – Ladakh",
    start: { name: "Srinagar", coords: pt(34.0837, 74.7973) },
    destination: { name: "Leh", coords: pt(34.1526, 77.5771) },
    waypoints: [[34.0837, 74.7973], [34.3, 75.293], [34.283, 75.475], [34.432, 75.764], [34.5539, 76.1349], [34.43, 76.35], [34.286, 76.786], [34.326, 76.876], [34.183, 77.348], [34.1526, 77.5771]],
    distanceKm: 420,
    durationLabel: "10–12 h (usually 2 days)",
    suggestedDays: "2 days",
    difficulty: "Moderate",
    terrain: ["Mountain pass", "Paved high road", "Barren moonscape"],
    bestSeason: "June – September",
    description: "The more forgiving route into Ladakh: through the Sonamarg meadows, over Zoji La, then a mostly paved run through Drass, Kargil and the 'moonland' at Lamayuru.",
    highlights: ["Sonamarg's alpine meadows", "Zoji La — a dramatic, narrow pass", "Drass, one of the coldest inhabited places in India", "Lamayuru's lunar landscape and monastery"],
    riderNotes: ["Zoji La can be rough and one-way controlled; follow traffic timings.", "Kargil is the usual overnight halt.", "Check pass status and security advisories before leaving.", "Altitude rises quickly after Kargil — go slow on day two."],
    image: "/images/fog-rider.webp",
  },
  {
    id: "guwahati-tawang",
    name: "Guwahati to Tawang",
    region: "Assam – Arunachal Pradesh",
    start: { name: "Guwahati", coords: pt(26.1445, 91.7362) },
    destination: { name: "Tawang", coords: pt(27.586, 91.859) },
    waypoints: [[26.1445, 91.7362], [26.6338, 92.8], [27.017, 92.65], [27.2645, 92.4157], [27.359, 92.241], [27.503, 92.095], [27.669, 91.978], [27.586, 91.859]],
    distanceKm: 480,
    durationLabel: "13–15 h (usually 2 days)",
    suggestedDays: "2 days",
    difficulty: "Hard",
    terrain: ["Mountain road", "High pass", "Landslide-prone sections"],
    bestSeason: "March – May, October – November",
    description: "From the Brahmaputra plains up into the eastern Himalaya: Bhalukpong, Bomdila, Dirang and the 4,100 m Sela Pass, ending at Tawang's great monastery.",
    highlights: ["Tezpur and the Kameng river valley", "Dirang's apple orchards and hot springs", "Sela Pass and Sela Lake", "Tawang Monastery, one of the largest in India"],
    riderNotes: ["Arunachal Pradesh needs a permit (Inner Line Permit for Indian visitors) — apply ahead and check current rules.", "Landslides and fog are frequent; allow buffer days.", "Stay overnight at Dirang or Bomdila to cross Sela in daylight.", "Mobile coverage is patchy beyond Bomdila."],
    image: "/images/mist-monochrome.webp",
  },
  {
    id: "kochi-munnar",
    name: "Kochi to Munnar",
    region: "Kerala",
    start: { name: "Kochi", coords: pt(9.9312, 76.2673) },
    destination: { name: "Munnar", coords: pt(10.0889, 77.0595) },
    waypoints: [[9.9312, 76.2673], [9.9894, 76.579], [10.06, 76.629], [10.05, 76.97], [10.01, 76.96], [10.0889, 77.0595]],
    distanceKm: 130,
    durationLabel: "3.5–4 h",
    suggestedDays: "Day ride or weekend",
    difficulty: "Easy",
    terrain: ["Hill road", "Waterfalls", "Tea estates"],
    bestSeason: "September – March",
    description: "A short, scenic climb from the backwaters into Kerala's tea hills, past waterfalls and spice forests on the way to Munnar.",
    highlights: ["Cheeyappara and Valara waterfalls by the road", "Forest section between Neriamangalam and Adimali", "Endless tea estates around Munnar", "Cool, misty air at 1,500 m"],
    riderNotes: ["Wet-season rain makes the road slick — and the scenery at its greenest.", "Elephants cross at dusk in forest stretches; avoid riding after dark.", "Traffic builds on weekends — start early."],
    image: "/images/hero-forest-road.webp",
  },
  {
    id: "jaipur-jaisalmer",
    name: "Jaipur to Jaisalmer",
    region: "Rajasthan",
    start: { name: "Jaipur", coords: pt(26.9124, 75.7873) },
    destination: { name: "Jaisalmer", coords: pt(26.9157, 70.9083) },
    waypoints: [[26.9124, 75.7873], [26.4499, 74.6399], [26.2389, 73.0243], [26.9157, 71.9249], [26.9157, 70.9083]],
    distanceKm: 560,
    durationLabel: "9–10 h",
    suggestedDays: "1–2 days",
    difficulty: "Moderate",
    terrain: ["Highway", "Desert road", "Sand drifts"],
    bestSeason: "October – March",
    description: "A big-sky run across Rajasthan: Ajmer, Jodhpur's blue city, then straight desert roads to the golden fort town of Jaisalmer.",
    highlights: ["Pushkar and Ajmer detour", "Jodhpur's Mehrangarh Fort", "Long, empty desert straights past Pokaran", "Golden hour at Jaisalmer Fort"],
    riderNotes: ["Daytime heat is brutal outside winter — hydrate and start early.", "Sand can drift across the road in places; keep speed down on blind curves.", "Livestock and trucks share the road: stay alert on straights where it's easy to relax."],
    image: "/images/motion-road.webp",
  },
  {
    id: "shimla-spiti",
    name: "Shimla to Spiti",
    region: "Himachal Pradesh",
    start: { name: "Shimla", coords: pt(31.1048, 77.1734) },
    destination: { name: "Kaza (Spiti)", coords: pt(32.2276, 78.071) },
    waypoints: [[31.1048, 77.1734], [31.26, 77.45], [31.45, 77.64], [31.53, 78.27], [31.88, 78.6], [32.09, 78.38], [32.2276, 78.071]],
    distanceKm: 410,
    durationLabel: "12–14 h (usually 2 days)",
    suggestedDays: "2 days",
    difficulty: "Hard",
    terrain: ["Cliff-edge road", "Narrow mountain road", "High-altitude desert"],
    bestSeason: "May – October",
    description: "Up the Sutlej valley through Kinnaur's apple country on cliff-hugging roads, then into the stark high desert of Spiti.",
    highlights: ["Narkanda's forests and views", "Kinnaur Kailash from Reckong Peo", "Nako lake and the Hangrang valley", "Tabo and Key monasteries"],
    riderNotes: ["Some stretches are carved into sheer rock with long drops — ride slowly and stay on your side.", "Landslides can close the road for hours; keep a buffer day.", "Acclimatise at Kalpa or Nako before going above 3,500 m.", "Fuel stops thin out after Reckong Peo — fill up there before heading on."],
    image: "/images/fog-rider.webp",
  },
];

export const getFamousRoute = (id: string | undefined): FamousRoute | null => FAMOUS_ROUTES.find((r) => r.id === id) ?? null;
