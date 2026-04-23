import { Request, Response } from "express";
import ReceiptService from "./service";
import { RECEIPT_MESSAGES } from "../../constants/messages";

export const uploadReceipt = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: RECEIPT_MESSAGES.FILE_REQUIRED,
      });
    }

    const result = await ReceiptService.processReceipt(file.path);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: RECEIPT_MESSAGES.PROCESS_FAILED,
    });
  }
};

export const saveReceipt = async (req: Request, res: Response) => {
  try {
    const receiptData = req.body;

    if (!receiptData || !receiptData.merchant || !receiptData.date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: merchant, date",
      });
    }

    const result = ReceiptService.saveReceipt(receiptData);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      message: "Receipt saved successfully",
      id: result.id,
    });
  } catch (error) {
    console.error("Save error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save receipt",
    });
  }
};

export const getReceipt = async (req: Request, res: Response) => {
  try {
    const result = ReceiptService.getAllReceipts();

    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get receipts",
    });
  }
};