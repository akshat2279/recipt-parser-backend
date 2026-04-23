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

**Exclusions**: Taxes, tips, and service charges are stored as Receipt Metadata.

**Logic**: If the LLM identifies a discount, it is treated as a negative line item to ensure the mathematical "Sum of Items" remains accurate for the user.

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

## Product Pushback (Assignment Q5)

### The Issue: Ambiguity in "Valid" Receipt Inputs

The project specification asks for a "Receipt Parser" but fails to define what constitutes a valid input. While building the upload flow, I identified a significant gap: What is the minimum acceptable image quality or document type?

### My Pushback

The spec assumes all uploads will be clear, well-lit receipts. In practice, users upload blurry photos, menus, or non-receipt documents.

### The Solution I implemented

Instead of the system "guessing" and potentially saving hallucinated data, I programmed the backend to return a null-state JSON if the LLM's confidence in the document type is low. This forces a manual review.

### Recommendation for Spec

The requirements should include a "Validation Phase" where the system confirms the presence of a Merchant Name and Total before attempting a line-item extraction.
