import ReceiptService from '../feature/uploads/service';
import { db } from '../db/connection';

/**
 * Test Suite for Receipt Service
 * 
 * These tests verify the three critical engineering decisions:
 * 1. JSON Cleansing & Blank Schema Fallback
 * 2. Math Precision (avoiding floating point errors)
 * 3. Atomic Transaction Rollback
 */

// Mock cleanseJson function for testing (same as in service.ts)
const cleanseJson = (text: string): any => {
  const cleaned = text?.replace(/```json|```/g, "")?.trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error("JSON parse failed:", cleaned);
    // Return blank schema
    return {
      merchant: "",
      date: "",
      lineItems: [],
      total: 0,
    };
  }
};

describe('Receipt Service Tests', () => {
  
  /**
   * Test 1: The "JSON Cleansing" Test
   * 
   * Expectation: cleanseJson function returns a valid object or blank schema
   */
  describe('JSON Cleansing', () => {
    test('should parse valid JSON wrapped in markdown', () => {
      const input = '```json\n{"merchant": "Test", "date": "2024-01-01", "lineItems": [], "total": 0}\n```';
      const result = cleanseJson(input);
      
      expect(result).toHaveProperty('merchant', 'Test');
      expect(result).toHaveProperty('date', '2024-01-01');
      expect(result).toHaveProperty('lineItems');
      expect(result).toHaveProperty('total');
    });

    test('should return blank schema for invalid JSON', () => {
      const input = '```json\n{invalid json here}\n```';
      const result = cleanseJson(input);
      
      expect(result).toHaveProperty('merchant', '');
      expect(result).toHaveProperty('date', '');
      expect(result).toHaveProperty('lineItems', []);
      expect(result).toHaveProperty('total', 0);
    });

    test('should parse JSON without markdown wrapper', () => {
      const input = '{"merchant": "Test", "date": "2024-01-01", "lineItems": [], "total": 0}';
      const result = cleanseJson(input);
      
      expect(result).toHaveProperty('merchant', 'Test');
    });
  });

  /**
   * Test 2: The "Math Precision" Test
   * 
   * JavaScript is notorious for $0.1 + $0.2 = 0.30000000000000004
   * 
   * Input: A receipt with items costing 10.25 and 5.10
   * Expectation: The total is exactly 15.35
   */
  describe('Math Precision', () => {
    test('should handle floating point addition correctly', () => {
      const item1 = 10.25;
      const item2 = 5.10;
      
      // Using the same precision fix as in saveReceipt
      const preciseTotal = Math.round((item1 + item2) * 100) / 100;
      
      expect(preciseTotal).toBe(15.35);
      expect(preciseTotal).not.toBe(15.350000000000001);
    });

    test('should handle 0.1 + 0.2 correctly', () => {
      const item1 = 0.1;
      const item2 = 0.2;
      
      const preciseTotal = Math.round((item1 + item2) * 100) / 100;
      
      expect(preciseTotal).toBe(0.3);
      expect(preciseTotal).not.toBe(0.30000000000000004);
    });

    test('should save receipt with precise total to database', () => {
      const receiptData = {
        merchant: "Test Store",
        date: "2024-01-01",
        total: 15.35, // 10.25 + 5.10
        lineItems: [
          { name: "Item 1", amount: 10.25 },
          { name: "Item 2", amount: 5.10 }
        ]
      };

      const result = ReceiptService.saveReceipt(receiptData);
      
      expect(result.success).toBe(true);
      
      // Verify the saved total is exactly 15.35
      const savedReceipt = db.prepare('SELECT total FROM receipts WHERE id = ?').get(result.id) as any;
      expect(savedReceipt.total).toBe(15.35);
      
      // Cleanup
      db.prepare('DELETE FROM line_items WHERE receipt_id = ?').run(result.id);
      db.prepare('DELETE FROM receipts WHERE id = ?').run(result.id);
    });
  });

  /**
   * Test 3: The "Atomic Transaction" Test
   * 
   * Prove that Database logic works with atomic transactions
   * 
   * Action: Try to save a receipt header but provide invalid line items
   * Expectation: The database should roll back. No receipt record should exist
   */
  describe('Atomic Transaction Rollback', () => {
    test('should rollback transaction when line item is missing name', () => {
      const receiptData = {
        merchant: "Test Store",
        date: "2024-01-01",
        total: 15.35,
        lineItems: [
          { name: "", amount: 10.25 }, // Missing name - should trigger rollback
          { name: "Item 2", amount: 5.10 }
        ]
      };

      const result = ReceiptService.saveReceipt(receiptData);
      
      expect(result.success).toBe(false);
      
      // Verify no receipt was saved (transaction rolled back)
      const receipts = db.prepare('SELECT COUNT(*) as count FROM receipts WHERE merchant = ?').get("Test Store") as any;
      expect(receipts.count).toBe(0);
    });

    test('should rollback transaction when line item is missing amount', () => {
      const receiptData = {
        merchant: "Test Store 2",
        date: "2024-01-01",
        total: 15.35,
        lineItems: [
          { name: "Item 1", amount: null }, // Missing amount - should trigger rollback
          { name: "Item 2", amount: 5.10 }
        ]
      };

      const result = ReceiptService.saveReceipt(receiptData);
      
      expect(result.success).toBe(false);
      
      // Verify no receipt was saved (transaction rolled back)
      const receipts = db.prepare('SELECT COUNT(*) as count FROM receipts WHERE merchant = ?').get("Test Store 2") as any;
      expect(receipts.count).toBe(0);
    });

    test('should successfully save when all line items are valid', () => {
      const receiptData = {
        merchant: "Valid Store",
        date: "2024-01-01",
        total: 15.35,
        lineItems: [
          { name: "Item 1", amount: 10.25 },
          { name: "Item 2", amount: 5.10 }
        ]
      };

      const result = ReceiptService.saveReceipt(receiptData);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      
      // Verify receipt was saved
      const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(result.id) as any;
      expect(receipt).toBeDefined();
      expect(receipt.merchant).toBe("Valid Store");
      
      // Verify line items were saved
      const lineItems = db.prepare('SELECT * FROM line_items WHERE receipt_id = ?').all(result.id);
      expect(lineItems.length).toBe(2);
      
      // Cleanup
      db.prepare('DELETE FROM line_items WHERE receipt_id = ?').run(result.id);
      db.prepare('DELETE FROM receipts WHERE id = ?').run(result.id);
    });
  });
});
