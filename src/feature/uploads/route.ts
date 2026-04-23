import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { RECEIPT_ROUTES } from "../../constants/routes";
import { uploadReceipt, saveReceipt, getReceipt } from "./controller";

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: "uploads/" });

router.post(
  RECEIPT_ROUTES.UPLOAD,
  upload.single("receipt"),
  uploadReceipt
);

router.post(RECEIPT_ROUTES.SAVE, saveReceipt);

router.get(RECEIPT_ROUTES.GET, getReceipt);

export default router;      