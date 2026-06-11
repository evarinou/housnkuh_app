/**
 * @file vatMapping.ts
 * @purpose German VAT rate mapping for FlourIO categories
 * @created 2025-10-16
 * @description Maps FlourIO article categories to German VAT rates
 *
 * German VAT Rates (2025):
 * - 7%: Reduced rate (Ermäßigter Steuersatz) - Food, books, newspapers
 * - 19%: Standard rate (Regelsteuersatz) - All other goods and services
 */

/**
 * VAT rate mapping: FlourIO category → German VAT rate
 *
 * Reduced rate (7%) applies to:
 * - Fresh food (vegetables, fruits, meat, fish, dairy, eggs)
 * - Bread and bakery products
 * - Non-alcoholic beverages (except lemonades with >25% added sugar)
 *
 * Standard rate (19%) applies to:
 * - Prepared/processed foods
 * - Alcoholic beverages
 * - Non-food items
 */
export const VAT_RATE_MAPPING: Record<string, number> = {
  // Fresh Food - 7% reduced rate
  'vegetables': 7,
  'fruits': 7,
  'berries': 7,
  'herbs': 7,
  'salads': 7,

  // Animal Products - 7% reduced rate
  'meat': 7,
  'poultry': 7,
  'fish': 7,
  'sausages': 7,
  'dairy': 7,
  'cheese': 7,
  'eggs': 7,
  'milk': 7,

  // Bread & Bakery - 7% reduced rate
  'bread': 7,
  'bakery': 7,
  'pastries': 7,

  // Honey & Preserves - 7% reduced rate
  'honey': 7,
  'jam': 7,
  'preserves': 7,

  // Non-alcoholic Beverages - 7% reduced rate
  'beverages': 7,
  'juices': 7,
  'water': 7,
  'tea': 7,
  'coffee': 7,

  // Grains & Legumes - 7% reduced rate
  'grains': 7,
  'flour': 7,
  'rice': 7,
  'pasta': 7,
  'legumes': 7,

  // Processed Foods - 19% standard rate
  'prepared-foods': 19,
  'ready-meals': 19,
  'frozen-foods': 19,
  'convenience-foods': 19,

  // Alcoholic Beverages - 19% standard rate
  'wine': 19,
  'beer': 19,
  'spirits': 19,
  'liquor': 19,

  // Non-Food - 19% standard rate
  'crafts': 19,
  'textiles': 19,
  'household': 19,
  'cosmetics': 19,
  'cleaning': 19,
  'other': 19,

  // Canned/Preserved - 7% reduced rate (basic foods)
  'canned-goods': 7,
  'canned-vegetables': 7,
  'canned-fruits': 7,
};

/**
 * Get VAT rate for FlourIO category
 * @param flourioCategory FlourIO category name
 * @returns VAT rate (7 or 19)
 */
export function getVatRate(flourioCategory: string): number {
  const normalized = flourioCategory.toLowerCase().trim();
  return VAT_RATE_MAPPING[normalized] ?? 19; // Default to standard rate
}

/**
 * Check if category has reduced VAT rate
 */
export function hasReducedVatRate(flourioCategory: string): boolean {
  return getVatRate(flourioCategory) === 7;
}

/**
 * Update VAT rate mapping (admin function)
 * Used to override default mappings
 */
export function updateVatMapping(flourioCategory: string, vatRate: 7 | 19): void {
  VAT_RATE_MAPPING[flourioCategory.toLowerCase().trim()] = vatRate;
}
