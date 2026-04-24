# Receipt Parser AI - Backend Service

This is the core extraction and persistence engine for the Receipt Parser application. It leverages Gemini 2.5 Flash for multimodal processing and SQLite for lightweight, relational data storage.

##  Tech Stack

- **Node.js & Express**: Core backend framework.
- **Google Gemini 2.5 Flash**: Multimodal LLM chosen for its high-speed vision processing and low cost.
- **Better-SQLite3**: High-performance, synchronous SQLite driver for local persistence.
- **TypeScript**: Ensuring type safety across the extraction pipeline.
- **Multer**: For handling multipart/form-data file uploads.

##  Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
```

### 3. Running the Server

```bash
npm run dev
```

## Engineering Decisions & "Judgment"

### 1. Model Selection: Why Gemini 2.5 Flash?

| Model | Cost | Latency | Reasoning |
|-------|------|---------|-----------|
| Claude 3.5 Sonnet | High | 3-4s | High accuracy but expensive for a utility app. |
| GPT-4o | Med-High | 2-3s | Industry standard, but cost-prohibitive for high-volume parsing. |
| Gemini 2.5 Flash | Ultra Low | 1-2s | Selected. Fastest vision-to-JSON latency and native multimodal support at the best price point. |

### 2. Defining a "Line Item"

**Decision**: Line items are strictly quantity-based goods or services.

**Inclusions**: Item name, quantity, and unit price.

**Exclusions**: Taxes, tips, and service charges.

### 3. Resiliency: The "Manual Fallback" Pipeline

To ensure 100% task completion even when AI fails:

- **Regex Cleansing**: Strips Markdown wrappers (```json) before parsing.
- **Schema Fallback**: If the LLM cannot parse the image (e.g., blurry photo or non-receipt), the backend returns a blank schema instead of a 500 error.
- **UX Impact**: This allows the frontend to stay alive and display an empty form for manual entry.

### 4. Data Integrity & Privacy

- **Atomic Transactions**: Receipt headers and line items are saved in a single SQLite transaction to prevent orphaned records.
- **Stateless Footprint**: Uploaded images are processed and immediately deleted using `fs.unlinkSync` once the Gemini API response is received.

## API Contract

### POST /api/receipts/upload

**Input**: multipart/form-data (File)

**Response**: JSON

```json
{
  "success": true,
  "data": {
    "merchantName": "Starbucks",
    "date": "2024-05-20",
    "lineItems": [{"name": "Latte", "quantity": 1, "unitPrice": 5.50, "amount": 5.50}],
    "total": 5.95
  }
}
```


### What are the biggest tradeoffs you made, and why?

**Tradeoff 1: Conservative AI Fallback vs. Aggressive Automation**
Chose to return blank schema when AI confidence is low rather than attempting to parse ambiguous receipts. This prioritizes data accuracy over automation volume, preventing incorrect financial data from entering the system. In a production environment, bad data is worse than no data.

**Tradeoff 2: SQLite vs. PostgreSQL**
Used SQLite for simplicity and portability instead of a more robust database. This decision prioritizes ease of deployment and zero-configuration setup over scalability and concurrent access. For a utility application with single-user usage patterns, SQLite's atomic transactions and file-based storage are sufficient.


### What would you do with another week?

**Priority 1: Saved Receipts Management UI** - Build the frontend component to display previously saved receipts. Currently users can save receipts but can't view their history. Also build a mobile app to support mobile uploads.


**Priority 2: Receipt Validation Layer** - Implement pre-processing validation to detect non-receipt images before sending to AI, reducing costs and improving user experience.



### What's one thing in this spec you'd push back on if I were your PM?

**Pushback: Missing Definition of "Valid Receipt Input"**

The specification asks for a "receipt parser" but never defines what constitutes a valid receipt image or minimum quality requirements. This is a critical gap because real-world users upload blurry photos, menus, invoices, and non-receipt documents.

**My Implementation**: Rather than guessing and potentially saving hallucinated data, I implemented a conservative approach that returns a blank schema when AI confidence is low, forcing manual entry.

**Spec Recommendation**: The requirements should include a "Validation Phase" that confirms the presence of merchant name and total before attempting line-item extraction, with clear user guidance for invalid inputs.

This pushback addresses the core assumption that users will upload perfect receipt images, which doesn't align with real-world usage patterns and could lead to poor user experience or incorrect data being saved to the system.
