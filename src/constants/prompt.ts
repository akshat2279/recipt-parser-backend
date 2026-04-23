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