import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");
console.log("Upload Directory:", uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Determine if this is a pizza or combo upload based on the route
    const isPizzaRoute =
      req.originalUrl.includes("/addPizza") ||
      req.originalUrl.includes("/updatePizza");
    const entityType = isPizzaRoute ? "pizza" : "combo";
    const entityId =
      req.body.pizzaId ||
      req.body.comboId ||
      req.params.pizzaId ||
      req.params.comboId;

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${entityType}-${entityId}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const convertToPng = async (req, res, next) => {
  if (!req.file) return next();

  const originalPath = path.join(uploadDir, req.file.filename);
  const pngFilename = req.file.filename.replace(
    path.extname(req.file.filename),
    ".png"
  );
  const pngPath = path.join(uploadDir, pngFilename);

  try {
    await sharp(originalPath).png().toFile(pngPath);
    fs.unlinkSync(originalPath); // Remove original file

    // Update req.file to reflect new .png
    req.file.filename = pngFilename;
    req.file.path = pngPath;

    next();
  } catch (err) {
    console.error("Error converting image to PNG:", err);
    return res.status(500).json({ error: "Failed to process image" });
  }
};

export const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(uploadDir, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};

export { upload, convertToPng };
