import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serveImmg = async (req, res) => {
  console.log("Serving image...");
  const imageName = req.params.imageName;

  // Safely resolve the image path inside the "uploads" folder
  const imagePath = path.resolve(__dirname, "../../src/uploads", imageName);
  console.log("Resolved Image path:", __dirname);
  console.log("Image path:", imagePath);

  // Check for path traversal: ensure the image path starts with the "uploads" directory
  if (!imagePath.startsWith(path.resolve(__dirname, "../../src/uploads"))) {
    return res.status(403).json({ error: "Forbidden: Invalid path" });
  }

  try {
    // Check if file exists using promises
    await fs.promises.access(imagePath, fs.constants.F_OK);

    // Set appropriate content type (optional but good practice)
    const contentType = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
    };

    const ext = path.extname(imageName).substring(1).toLowerCase();
    res.setHeader(
      "Content-Type",
      contentType[ext] || "application/octet-stream"
    );

    // Pipe the image to the response
    const stream = fs.createReadStream(imagePath);
    stream.pipe(res);
  } catch (err) {
    console.error("Error accessing image:", err);
    return res.status(404).json({ error: "Image not found" });
  }
};

export default serveImmg;
