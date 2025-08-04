// server/src/types/zusatzleistungenTypes.ts
// Request and Response types for Zusatzleistungen API endpoints

export interface ZusatzleistungenOptions {
  lagerservice?: boolean;
  versandservice?: boolean;
}

export interface CreateVertragRequest {
  mietfachId: string;
  laufzeitMonate: number;
  provisionssatz: number;
  zusatzleistungen?: ZusatzleistungenOptions;
}

export interface PriceCalculationRequest {
  mietfachTyp: string;
  laufzeitMonate: number;
  provisionssatz: number;
  zusatzleistungen?: ZusatzleistungenOptions;
}

export interface ZusatzleistungenPricing {
  lagerservice: number;
  versandservice: number;
}

export interface PreisDetails {
  grundpreis: number;
  zusatzleistungen: ZusatzleistungenPricing;
  monatlicheKosten: number;
  laufzeitMonate: number;
  zwischensumme: number;
  rabatt: number;
  rabattBetrag: number;
  gesamtpreis: number;
  provision: {
    satz: number;
    monatlich: number;
  };
}

export interface PriceCalculationResponse {
  success: boolean;
  preisDetails: PreisDetails;
}

export interface CreateVertragResponse {
  success: boolean;
  vertrag: any; // Will be populated with actual Vertrag document
  preisDetails: {
    grundpreis: number;
    lagerservice: number;
    versandservice: number;
    gesamtMonatlich: number;
    laufzeit: number;
    rabatt: number;
    gesamtpreis: number;
  };
}

export interface ValidationError {
  success: false;
  error: string;
}

// Constants for pricing
export const ZUSATZLEISTUNGEN_PRICING = {
  lagerservice: 20.00,
  versandservice: 5.00
} as const;

// Constants for mietfach base prices (matching frontend PackageBuilder)
export const MIETFACH_BASE_PRICES = {
  'block-a': 35,           // Verkaufsblock Lage A
  'block-b': 15,           // Verkaufsblock Lage B  
  'block-cold': 50,        // Verkaufsblock gekühlt
  'block-frozen': 60,      // Verkaufsblock gefroren
  'block-table': 40,       // Verkaufstisch
  'block-other': 0,        // Flexibler Bereich (auf Anfrage)
  'window-small': 30,      // Schaufenster klein
  'window-large': 60,      // Schaufenster groß
  // Legacy/database types
  'schaufenster': 30,      // Default Schaufenster 
  'kuehl': 50,            // Kühlbereich
  'gefrier': 60,          // Gefrierbereich
  'regal': 25,            // Standard Regal
  'sonstiges': 40,        // Sonstiges (mapped to Verkaufstisch price)
  // Legacy names for backwards compatibility
  'Klein': 75,
  'Mittel': 100,
  'Groß': 150,
  'Premium': 200
} as const;

export type MietfachTyp = keyof typeof MIETFACH_BASE_PRICES;

// Helper function to calculate discount based on duration
export function calculateRabatt(monate: number): number {
  if (monate >= 12) return 15;
  if (monate >= 6) return 10;
  if (monate >= 3) return 5;
  return 0;
}

// Helper function to calculate monthly total including zusatzleistungen
export function calculateMonthlyTotal(
  grundpreis: number, 
  zusatzleistungen?: ZusatzleistungenOptions
): number {
  let total = grundpreis;
  if (zusatzleistungen?.lagerservice) total += ZUSATZLEISTUNGEN_PRICING.lagerservice;
  if (zusatzleistungen?.versandservice) total += ZUSATZLEISTUNGEN_PRICING.versandservice;
  return total;
}