import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) cb(null, true);
  else cb(new Error("Only image files (jpg, jpeg, png, webp, gif) are allowed"), false);
};

const makeStorage = (subfolder) => {
  const dir = path.join(__dirname, `../../uploads/${subfolder}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${subfolder.replace("/", "-")}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  });
};

export const uploadProduct = multer({
  storage: makeStorage("products"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadLogo = multer({
  storage: makeStorage("logo"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB for logo
});

// Default export kept for backward compatibility
export default uploadProduct;
