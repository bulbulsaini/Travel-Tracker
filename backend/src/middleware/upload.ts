
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { Request } from "express";

const uploadDir = path.resolve(process.cwd(), "uploads", "tickets");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    !allowedExtensions.has(extension) ||
    !allowedMimeTypes.has(file.mimetype)
  ) {
    return cb(
      new Error("Invalid file type. Upload a PDF, JPG, JPEG, or PNG file.")
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});
