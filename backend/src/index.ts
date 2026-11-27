
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.routes";
import travelRoutes from "./routes/travel.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Use the same uploads directory as Multer.
const uploadsDirectory = path.resolve(process.cwd(), "uploads");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded tickets and other uploaded files.
app.use("/uploads", express.static(uploadsDirectory));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/admin", adminRoutes);

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled backend error:", err);

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size must not exceed 10 MB.",
      });
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving uploads from: ${uploadsDirectory}`);
});
