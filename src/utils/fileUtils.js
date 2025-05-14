import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");

/**
 * Renames a file in the uploads directory to match the entity ID
 * @param {string} tempFilename - The temporary filename created by multer
 * @param {string} entityId - The ID of the entity (combo or pizza)
 * @param {string} entityType - The type of entity ('combo' or 'pizza')
 * @returns {string} - The new filename
 */
export const renameFileToMatchId = (tempFilename, entityId, entityType) => {
  try {
    if (!tempFilename) return null;

    const fileExt = path.extname(tempFilename);
    const newFilename = `${entityType}-${entityId}${fileExt}`;
    const oldPath = path.join(uploadDir, tempFilename);
    const newPath = path.join(uploadDir, newFilename);

    // Check if the file exists
    if (!fs.existsSync(oldPath)) {
      console.error(`File not found: ${oldPath}`);
      return null;
    }

    // Rename the file
    fs.renameSync(oldPath, newPath);
    console.log(`File renamed from ${tempFilename} to ${newFilename}`);

    return newFilename;
  } catch (error) {
    console.error("Error renaming file:", error);
    return null;
  }
};

/**
 * Deletes a file from the uploads directory
 * @param {string} filename - The filename to delete
 */
export const deleteFile = (filename) => {
  try {
    if (!filename) return;

    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted: ${filename}`);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};
