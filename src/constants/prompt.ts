// export const prompt = `
// You are a strict receipt parsing system.

// Your task is to extract structured data from a receipt image.

// Return ONLY valid JSON. Do not include any explanation, text, or markdown.

// Output format:
// {
//   "merchant": string | null,
//   "date": string | null, // format: YYYY-MM-DD if possible
//   "lineItems": [
//     {
//       "name": string,
//       "amount": number
//     }
//   ],
//   "total": number | null
// }

// Rules:
// - Do NOT hallucinate values. If a field is not clearly visible, return null.
// - "merchant" should be the store or business name at the top of the receipt.
// - "date" should be the transaction date (prefer ISO format YYYY-MM-DD).
// - "lineItems" should include only purchased items with a name and price.
// - Exclude taxes, discounts, tips, subtotals, and totals from lineItems.
// - If quantity is present, ignore it and only return the final price per item.
// - If item names are unclear, still include them but keep them short and readable.
// - "total" should be the final payable amount on the receipt.

// Formatting rules:
// - Return pure JSON only (no backticks, no markdown).
// - Ensure valid JSON syntax (no trailing commas, proper quotes).
// - Numbers must be numeric, not strings.

// If nothing can be extracted, return:
// {
//   "merchant": null,
//   "date": null,
//   "lineItems": [],
//   "total": null
// }
// `;

export const prompt = `
## INSTRUCTIONS
Extract structured financial data from the provided receipt image. 
Your goal is 100% accuracy for the final total and merchant identification.

## CONSTRAINTS
- **Merchant**: Identify the primary business name. Ignore mall names or food court names unless they are the sole merchant.
- **Date**: Extract in YYYY-MM-DD format. If only month/day exist, assume the current year (2026).
- **Line Items**: 
    - Include only tangible goods/services.
    - **EXCLUDE**: Subtotals, Tax, Tips, Card Surcharges, or Discounts as separate items.
    - If a discount is applied to an item, use the net price for that item.
- **Total**: This must be the final amount charged to the payment method.
- **Uncertainty**: If a field is illegible, return null. Do not guess.

## DATA SCHEMA
{
  "merchant": string | null,
  "date": string | null,
  "lineItems": [
    { "name": string, "amount": number }
  ],
  "total": number | null,
  "confidenceScore": number // A value between 0 and 1 representing your certainty
}

## OUTPUT
Return ONLY valid JSON. No markdown, no conversational fillers.
`;