import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RECEIPT_MESSAGES } from "../../constants/messages";
import { prompt } from "../../constants/prompt";
import { db } from "../../db/connection";
import { v4 as uuidv4 } from "uuid";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Helper function to cleanse JSON and return blank schema on failure
const cleanseJson = (text: string): any => {
  const cleaned = text?.replace(/```json|```/g, "")?.trim();
  

  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    // Return blank schema
    return {
      merchant: "",
      date: "",
      lineItems: [],
      total: 0,
    };
  }
};

class ReceiptService {
  static processReceipt = async (filePath: string) => {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString("base64");

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg",
          },
        },
      ]);
      const text = result.response.text();

      // Use cleanseJson function which returns blank schema on failure
      const parsedData = cleanseJson(text);

      // If we got blank schema, return failure
      if (!parsedData.merchant && !parsedData.date && parsedData.total === 0) {
        return {
          success: false,
          message: "Invalid response from AI. Please edit manually.",
          data: parsedData,
        };
      }

      return {
        success: true,
        message: RECEIPT_MESSAGES.PROCESS_SUCCESS,
        data: parsedData,
      };

        
    } catch (error) {
      console.error("Processing error:", error);

      return {
        success: false,
        message: RECEIPT_MESSAGES.PROCESS_FAILED,
      };
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  };

  static saveReceipt = (receiptData: any) => {
    const { merchant, date, total, lineItems } = receiptData;
    const receiptId = uuidv4();

    // Fix math precision: convert to integer math then back to 2 decimal places
    const preciseTotal = Math.round(total * 100) / 100;

    const insertReceipt = db.prepare(`
      INSERT INTO receipts (id, merchant, date, total, raw_data)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertLineItem = db.prepare(`
      INSERT INTO line_items (receipt_id, name, amount)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction((items: any[]) => {
      insertReceipt.run(
        receiptId,
        merchant,
        date,
        preciseTotal,
        JSON.stringify(receiptData)
      );

      for (const item of items) {
        // Validate required fields - this will trigger rollback if missing
        if (!item.name || item.amount === undefined || item.amount === null) {
          throw new Error("Line item missing required field: name or amount");
        }

        // Also fix precision for line item amounts
        const preciseAmount = Math.round(item.amount * 100) / 100;
        insertLineItem.run(receiptId, item.name, preciseAmount);
      }
    });

    try {
      transaction(lineItems);
      return { success: true, id: receiptId };
    } catch (error) {
      console.error("Save failed:", error);
      return {
        success: false,
        message: RECEIPT_MESSAGES.PROCESS_FAILED,
      };
    }
  };



  static getAllReceipts = () => {
    try {
      const receipts = db.prepare(`
        SELECT * FROM receipts ORDER BY created_at DESC
      `).all();

      // Add line items to each receipt
      const receiptsWithItems = receipts.map((receipt: any) => {
        const lineItems = db.prepare(`
          SELECT name, amount FROM line_items WHERE receipt_id = ?
        `).all(receipt.id);

        return {
          ...receipt,
          lineItems,
        };
      });

      return receiptsWithItems;
    } catch (error) {
      console.error("Get all receipts failed:", error);
      return {
        success: false,
        message: RECEIPT_MESSAGES.PROCESS_FAILED,
      };
    }
  };
}

export default ReceiptService;
