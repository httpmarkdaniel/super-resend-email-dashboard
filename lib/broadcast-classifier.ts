import type { BusinessUnit } from "./types";

/**
 * "Broadcast Category" is a logical campaign grouping WE derive from
 * business_unit + subject text. It has nothing to do with Resend's native
 * Broadcast object. Rules below are grounded in real subjects sampled from
 * public.email_logs (see PR discussion / chat history), not guessed.
 *
 * Matching is case-insensitive, whitespace-tolerant, word-boundary based
 * (so short keywords like "car" don't match inside "care"/"scar").
 * Business unit is evaluated first — the same keyword can mean different
 * things in different business units, so rules never cross business units.
 *
 * Rule order encodes precedence: specific campaign/product/service
 * categories are checked before generic lifecycle/promo wording (e.g.
 * "Trucks, Machinery & Compressors" beats "Auction Ending Soon" even
 * though the same subject contains "...Auctions End Sept. 5").
 */

export const RETAIL_CATEGORIES = [
  "Payday Sale",
  "Weekend Sale",
  "New Arrivals",
  "Loyalty / Rewards Program",
  "Voucher / Promo",
  "Clearance / Sale",
  "Product Feature",
  "Store / Branch Promotion",
  "Seasonal Campaign",
  "Other Retail Broadcast",
] as const;

export const AUCTIONS_CATEGORIES = [
  "Employee & Partner Sales",
  "Trucks, Machinery & Compressors",
  "Vehicles / Automotive",
  "Industrial Equipment",
  "Property / Specialized Auction",
  "Registration / Bidding",
  "Auction Ending Soon",
  "Auction Reminder",
  "New Auction / Lots",
  "Other Auction Broadcast",
] as const;

export const ENVIROCYCLE_CATEGORIES = [
  "E-Waste Recycling",
  "Data Destruction / Security",
  "IT Asset Disposal",
  "Recycling Campaign",
  "Collection / Pickup",
  "Environmental Services",
  "Corporate Sustainability",
  "Sales Follow-Up / Outreach",
  "Partnership / Corporate Outreach",
  "Other Envirocycle Broadcast",
] as const;

export const SOLUTIONS_CATEGORIES = [
  "Structured Cabling & Network",
  "CCTV & Security Systems",
  "Fire Detection / FDAS",
  "Access Control",
  "Intercom & Nurse Call",
  "PABX / PA / BGM",
  "Building Management Systems",
  "ELV Systems",
  "Fit-Out & Auxiliaries",
  "Preventive Maintenance / After Sales",
  "Product / Equipment Offering",
  "Integrated Solutions",
  "Other HMR Solutions Broadcast",
] as const;

export const OTHER_BROADCAST = "Other Broadcast" as const;

export type BroadcastCategory =
  | (typeof RETAIL_CATEGORIES)[number]
  | (typeof AUCTIONS_CATEGORIES)[number]
  | (typeof ENVIROCYCLE_CATEGORIES)[number]
  | (typeof SOLUTIONS_CATEGORIES)[number]
  | typeof OTHER_BROADCAST;

interface Rule<C extends string> {
  category: C;
  keywords: string[];
}

function normalize(subject: string): string {
  return subject.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(text));
}

function firstMatch<C extends string>(text: string, rules: Rule<C>[], fallback: C): C {
  for (const rule of rules) {
    if (matchesAny(text, rule.keywords)) return rule.category;
  }
  return fallback;
}

// --- HMR Retail ---
// Real subjects: "Your exclusive HMREXPO code is inside", "Your HMR points
// are officially yours", "Don't lose your points.. your Loyalty Treat Club
// just got an upgrade", "Fresh arrivals & sale finds up to 70% off".
const RETAIL_RULES: Rule<(typeof RETAIL_CATEGORIES)[number]>[] = [
  { category: "Payday Sale", keywords: ["payday"] },
  { category: "Weekend Sale", keywords: ["weekend"] },
  {
    category: "New Arrivals",
    keywords: ["new arrival", "new arrivals", "just arrived", "fresh arrivals", "fresh arrival"],
  },
  // Added from real data: a recurring HMR loyalty-points campaign not in the starting taxonomy.
  { category: "Loyalty / Rewards Program", keywords: ["loyalty", "hmr points", "treat club", "rewards program"] },
  { category: "Voucher / Promo", keywords: ["voucher", "promo", "discount", "coupon"] },
  { category: "Clearance / Sale", keywords: ["clearance", "sale", "markdown"] },
  {
    category: "Seasonal Campaign",
    keywords: ["christmas", "new year", "valentine", "halloween", "back to school", "black friday", "holiday season"],
  },
  { category: "Store / Branch Promotion", keywords: ["branch", "store opening", "flagship store"] },
];

function classifyRetail(text: string): (typeof RETAIL_CATEGORIES)[number] {
  return firstMatch(text, RETAIL_RULES, "Other Retail Broadcast");
}

// --- HMR Auctions ---
// Real subjects sampled: "Trucks, Machinery & Compressors — Auctions End
// Sept. 5", "Affordable Vehicles from ₱15,000", "Bid Today: Cars, Pickups,
// Motorcycles & Tractors", "50+ Unused Generators & ATS...", "Industrial
// Spare Parts & Equipment Now Available", "Coca-Cola Employee Nego Sale |
// Offers Open August 7–10" (x4 variants incl. "Final Reminder"), "You're
// Invited: Explore HMR's Ongoing Online Auction".
const AUCTIONS_RULES: Rule<(typeof AUCTIONS_CATEGORIES)[number]>[] = [
  // Added from real data: a recurring named partner/employee sale campaign.
  // Must precede lifecycle keywords ("Final Reminder", "Final Day") so it
  // doesn't get swallowed by generic "reminder"/"ending soon" rules.
  { category: "Employee & Partner Sales", keywords: ["nego sale", "employee nego", "employee sale"] },
  { category: "Trucks, Machinery & Compressors", keywords: ["truck", "trucks", "machinery", "compressor", "compressors"] },
  {
    category: "Vehicles / Automotive",
    keywords: ["vehicle", "vehicles", "car", "cars", "automotive", "motorcycle", "motorcycles", "pickup", "pickups", "tractor", "tractors"],
  },
  // "generator"/"spare parts" added from real data alongside the given "industrial"/"equipment".
  { category: "Industrial Equipment", keywords: ["industrial", "equipment", "generator", "generators", "spare parts"] },
  { category: "Property / Specialized Auction", keywords: ["property", "real estate", "land for sale"] },
  { category: "Registration / Bidding", keywords: ["register", "registration", "bid now", "start bidding"] },
  {
    category: "Auction Ending Soon",
    keywords: ["ending soon", "last chance", "final call", "ends today", "final day", "auctions end"],
  },
  { category: "Auction Reminder", keywords: ["reminder"] },
  { category: "New Auction / Lots", keywords: ["new auction", "new lots", "new lot", "now live"] },
];

function classifyAuctions(text: string): (typeof AUCTIONS_CATEGORIES)[number] {
  return firstMatch(text, AUCTIONS_RULES, "Other Auction Broadcast");
}

// --- Envirocycle ---
// Real subjects: "Your E-Waste Deserves a Better Destination", "Envirocycle
// ITAD Session Follow-Up", "Just Checking In", "Following Up — Envirocycle",
// "Hazardous Waste Piling Up? We'll Handle It", "Envirocycle Company Name
// Change and Re-Accreditation Requirements" (administrative, not a
// campaign — falls to Other by design).
const ENVIROCYCLE_RULES: Rule<(typeof ENVIROCYCLE_CATEGORIES)[number]>[] = [
  { category: "E-Waste Recycling", keywords: ["e-waste", "ewaste", "electronic waste"] },
  { category: "Data Destruction / Security", keywords: ["data destruction", "data security", "secure destruction", "hard drive destruction"] },
  { category: "IT Asset Disposal", keywords: ["it asset", "itad", "asset disposal", "disposal"] },
  { category: "Recycling Campaign", keywords: ["recycle", "recycling"] },
  { category: "Collection / Pickup", keywords: ["collection", "pickup", "pick-up", "collection drive"] },
  // "hazardous waste" added from real data alongside the given "waste management".
  { category: "Environmental Services", keywords: ["environmental", "waste management", "hazardous waste"] },
  { category: "Corporate Sustainability", keywords: ["sustainability", "sustainable", "esg"] },
  // Added from real data: a recurring sales-outreach pattern distinct from
  // formal partnership content. Checked before Partnership/Corporate so a
  // specific ITAD/e-waste follow-up still resolves to its service category
  // first (rule order above already guarantees that).
  {
    category: "Sales Follow-Up / Outreach",
    keywords: ["checking in", "following up", "follow-up", "follow up", "picking up where we left off", "session follow-up"],
  },
  { category: "Partnership / Corporate Outreach", keywords: ["partnership", "corporate", "business"] },
];

function classifyEnvirocycle(text: string): (typeof ENVIROCYCLE_CATEGORIES)[number] {
  return firstMatch(text, ENVIROCYCLE_RULES, "Other Envirocycle Broadcast");
}

// --- HMR Solutions ---
// HMR Solutions Inc. is HMR's communications/ELV/systems-integration
// business, not generic B2B marketing. Only one distinct real subject was
// found in current data ("Planning any office, facility or building
// technology upgrades?" — generic discovery outreach, no service keyword,
// correctly resolves to Other below). The service taxonomy is otherwise
// taken as given (domain-specific, supplied by the business).
const SOLUTIONS_SERVICE_RULES: Rule<(typeof SOLUTIONS_CATEGORIES)[number]>[] = [
  { category: "Structured Cabling & Network", keywords: ["structured cabling", "cabling", "copper cabling", "fiber", "fibre", "network", "networking"] },
  { category: "CCTV & Security Systems", keywords: ["cctv", "camera", "cameras", "surveillance", "security camera", "security system"] },
  { category: "Fire Detection / FDAS", keywords: ["fdas", "fire detection", "fire alarm"] },
  { category: "Access Control", keywords: ["access control", "biometric", "door access"] },
  { category: "Intercom & Nurse Call", keywords: ["intercom", "nurse call", "nursecall"] },
  { category: "PABX / PA / BGM", keywords: ["pabx", "public address", "pa system", "pa/bgm", "bgm"] },
  { category: "Building Management Systems", keywords: ["building management", "bms"] },
  { category: "ELV Systems", keywords: ["elv", "extra low voltage", "extra-low voltage"] },
  { category: "Fit-Out & Auxiliaries", keywords: ["fit-out", "fit out", "auxiliary", "auxiliaries"] },
  { category: "Preventive Maintenance / After Sales", keywords: ["preventive maintenance", "maintenance", "after sales", "after-sales", "warranty"] },
];
const SOLUTIONS_EQUIPMENT_KEYWORDS = ["equipment", "materials", "supply", "distributor"];

function classifySolutions(text: string): (typeof SOLUTIONS_CATEGORIES)[number] {
  const matched = SOLUTIONS_SERVICE_RULES.filter((rule) => matchesAny(text, rule.keywords)).map((rule) => rule.category);
  if (matched.length === 1) return matched[0];
  // Multiple distinct services mentioned together -> a bundled offering,
  // e.g. "CCTV, FDAS, Access Control & Structured Cabling Solutions".
  if (matched.length >= 2) return "Integrated Solutions";
  if (matchesAny(text, SOLUTIONS_EQUIPMENT_KEYWORDS)) return "Product / Equipment Offering";
  return "Other HMR Solutions Broadcast";
}

/**
 * Classify a single email's broadcast category. Business unit is always
 * evaluated first; classification never crosses business units.
 */
export function classifyBroadcastCategory(
  businessUnit: BusinessUnit | string | null | undefined,
  subject: string | null | undefined
): BroadcastCategory {
  const text = normalize(subject ?? "");

  switch (businessUnit) {
    case "HMR Retail":
      return text ? classifyRetail(text) : "Other Retail Broadcast";
    case "HMR Auctions":
      return text ? classifyAuctions(text) : "Other Auction Broadcast";
    case "Envirocycle":
      return text ? classifyEnvirocycle(text) : "Other Envirocycle Broadcast";
    case "HMR Solutions":
      return text ? classifySolutions(text) : "Other HMR Solutions Broadcast";
    default:
      return OTHER_BROADCAST;
  }
}

export function categoriesForBusinessUnit(businessUnit: BusinessUnit | string): readonly string[] {
  switch (businessUnit) {
    case "HMR Retail":
      return RETAIL_CATEGORIES;
    case "HMR Auctions":
      return AUCTIONS_CATEGORIES;
    case "Envirocycle":
      return ENVIROCYCLE_CATEGORIES;
    case "HMR Solutions":
      return SOLUTIONS_CATEGORIES;
    default:
      return [OTHER_BROADCAST];
  }
}
