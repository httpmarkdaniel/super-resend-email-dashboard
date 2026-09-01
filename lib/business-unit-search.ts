import type { BusinessUnit } from "./types";

/**
 * Maps a search query to a business unit when it's an unambiguous alias
 * (exact match, case-insensitive, whitespace-tolerant) — never a substring
 * match, so a search for something like "new solutions pricing" does not
 * accidentally scope the dashboard to HMR Solutions.
 */
const BUSINESS_UNIT_ALIASES: Record<string, BusinessUnit> = {
  "hmr auctions": "HMR Auctions",
  auctions: "HMR Auctions",
  "hmr retail": "HMR Retail",
  retail: "HMR Retail",
  envirocycle: "Envirocycle",
  "hmr solutions": "HMR Solutions",
  solutions: "HMR Solutions",
};

export function matchBusinessUnitAlias(query: string): BusinessUnit | null {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  return BUSINESS_UNIT_ALIASES[normalized] ?? null;
}
