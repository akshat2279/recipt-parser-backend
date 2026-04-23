import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Configure dotenv BEFORE importing modules that use env vars
dotenv.config();

// routes
import uploadRoutes from "./feature/uploads/route";



const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());



// routes
app.use("/api/receipts", uploadRoutes);

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});