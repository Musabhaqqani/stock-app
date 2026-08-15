/**
 * Starting portfolio, ported from the spreadsheet/artifact prototype.
 *
 * Prices are placeholders from mid-Aug 2026 and exist only so a brand-new
 * account renders something sensible before the first price fetch. The
 * fetcher overwrites them on first refresh — treat them as expired the moment
 * the app can reach a data source.
 */

export type SeedStock = {
  name: string;
  ticker: string;
  theme: string;
  targetPct: number;
  price: number;
  shares: number;
};

export const DEFAULT_TOTAL_INVESTMENT_TARGET = 1_000_000; // INR

export const SEED_STOCKS: SeedStock[] = [
  { name: "Bharti Airtel", ticker: "BHARTIARTL", theme: "Digital Infrastructure", targetPct: 7, price: 1924, shares: 1 },
  { name: "Titan Company", ticker: "TITAN", theme: "Premium Consumer", targetPct: 7, price: 5090, shares: 1 },
  { name: "Pidilite Industries", ticker: "PIDILITIND", theme: "Construction Ecosystem", targetPct: 6, price: 1686, shares: 1 },
  { name: "Bajaj Finance", ticker: "BAJFINANCE", theme: "Consumer Finance", targetPct: 6, price: 1102, shares: 1 },
  { name: "ICICI Bank", ticker: "ICICIBANK", theme: "Financial Infrastructure", targetPct: 6, price: 1423, shares: 1 },
  { name: "Trent", ticker: "TRENT", theme: "Organized Retail", targetPct: 6, price: 3025, shares: 1 },
  { name: "Larsen & Toubro", ticker: "LT", theme: "Engineering & Infrastructure", targetPct: 6, price: 4037, shares: 1 },
  { name: "Adani Ports and Special Economic Zone", ticker: "ADANIPORTS", theme: "Trade & Logistics", targetPct: 6, price: 1681, shares: 1 },
  { name: "Dixon Technologies", ticker: "DIXON", theme: "Electronics Manufacturing", targetPct: 5, price: 14023, shares: 1 },
  { name: "Kaynes Technology India", ticker: "KAYNES", theme: "Advanced Electronics", targetPct: 5, price: 3718, shares: 1 },
  { name: "KPIT Technologies", ticker: "KPITTECH", theme: "Software-Defined Mobility", targetPct: 5, price: 630, shares: 1 },
  { name: "Persistent Systems", ticker: "PERSISTENT", theme: "Enterprise Technology & AI", targetPct: 4, price: 4639, shares: 1 },
  { name: "Mahindra & Mahindra", ticker: "M&M", theme: "Mobility & Farm Mechanisation", targetPct: 4, price: 3498, shares: 1 },
  { name: "InterGlobe Aviation", ticker: "INDIGO", theme: "Aviation", targetPct: 4, price: 5236, shares: 1 },
  { name: "Astral", ticker: "ASTRAL", theme: "Building Materials", targetPct: 4, price: 1481, shares: 1 },
  { name: "APL Apollo Tubes", ticker: "APLAPOLLO", theme: "Structural Building Systems", targetPct: 4, price: 2010, shares: 1 },
  { name: "Polycab India", ticker: "POLYCAB", theme: "Electrical Infrastructure", targetPct: 3, price: 9125, shares: 1 },
  { name: "KEI Industries", ticker: "KEI", theme: "Electrical Infrastructure", targetPct: 3, price: 5645, shares: 1 },
  { name: "Max Healthcare Institute", ticker: "MAXHEALTH", theme: "Healthcare", targetPct: 3, price: 1069, shares: 1 },
  { name: "Krishna Institute of Medical Sciences", ticker: "KIMS", theme: "Healthcare", targetPct: 3, price: 810, shares: 1 },
  { name: "Bharat Electronics", ticker: "BEL", theme: "Strategic Technology & Defence", targetPct: 3, price: 406, shares: 1 },
];
