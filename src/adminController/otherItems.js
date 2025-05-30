import { PrismaClient } from "@prisma/client";
import { deleteFile, renameFileToMatchId } from "../utils/fileUtils.js";

const prisma = new PrismaClient();

const addOtherItem = async (req, res) => {
  let tempImageUrl = req.file?.filename || "dummy.png";

  try {
    const { name, description, category, price } = req.body;

    if (!name || !price || !category) {
      if (req.file) deleteFile(tempImageUrl);
      return res
        .status(400)
        .json({ error: "Name, price and category are required" });
    }

    const categoryRecord = await prisma.category.findUnique({
      where: { id: category },
    });

    if (!categoryRecord) {
      if (req.file) deleteFile(tempImageUrl);
      return res.status(404).json({ error: "Category not found" });
    }

    const otherItem = await prisma.$transaction(async (tx) => {
      // Create the other item
      const newItem = await tx.otherItem.create({
        data: {
          name,
          description,
          price: Number(price),
          categoryId: category,
          imageUrl: tempImageUrl,
        },
      });
      
      console.log("New other item created:", newItem);

      // Rename uploaded file if not using dummy image
      if (tempImageUrl !== "dummy.png") {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          newItem.id,
          "other"
        );

        if (newImageUrl) {
          await tx.otherItem.update({
            where: { id: newItem.id },
            data: { imageUrl: newImageUrl },
          });
          newItem.imageUrl = newImageUrl;
        }
      }

      return {
        ...newItem,
        imageUrl: `/uploads/${newItem.imageUrl}`,
      };
    });

    res.status(201).json(otherItem);
  } catch (error) {
    if (req.file) deleteFile(tempImageUrl);
    console.error("Error creating other item:", error);
    res.status(500).json({ error: "Failed to create other item" });
  }
};

const updateOtherItem = async (req, res) => {
  try {
    const { id, name, category, description, price } = req.body;
    const tempImageUrl = req.file ? req.file.filename : null;

    if (!id) {
      if (req.file) deleteFile(tempImageUrl);
      return res.status(400).json({ error: "ID is required for update" });
    }

    const existingItem = await prisma.otherItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      if (req.file) deleteFile(tempImageUrl);
      return res.status(404).json({ error: "Other item not found" });
    }

    // Validate the category exists
    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { id: category },
      });

      if (!categoryRecord) {
        if (req.file) deleteFile(tempImageUrl);
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // If a new image was uploaded, delete the old one
      if (tempImageUrl && existingItem.imageUrl !== "dummy.png") {
        deleteFile(existingItem.imageUrl);
      }

      // Update the item with the new data
      const item = await tx.otherItem.update({
        where: { id },
        data: {
          name: name || existingItem.name,
          description: description || existingItem.description,
          price: price || existingItem.price,
          categoryId: category || existingItem.categoryId,
          imageUrl: tempImageUrl || existingItem.imageUrl,
        },
      });

      // If a new image was uploaded, rename it to match the item ID
      if (tempImageUrl) {
        const newImageUrl = renameFileToMatchId(tempImageUrl, item.id, "other");

        // Update the item with the new image URL if renaming was successful
        if (newImageUrl) {
          await tx.otherItem.update({
            where: { id: item.id },
            data: { imageUrl: newImageUrl },
          });
          item.imageUrl = newImageUrl;
        }
      }

      return {
        ...item,
        imageUrl: `/uploads/${item.imageUrl}`,
      };
    });

    res.json(updatedItem);
  } catch (error) {
    if (req.file) deleteFile(tempImageUrl);
    console.error("Error updating other item:", error);
    res.status(500).json({ error: "Failed to update other item" });
  }
};

const deleteOtherItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID is required for deletion" });
    }

    const existingItem = await prisma.otherItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return res.status(404).json({ error: "Other item not found" });
    }

    // Delete the image file if it exists and is not the dummy image
    if (existingItem.imageUrl && existingItem.imageUrl !== "dummy.png") {
      deleteFile(existingItem.imageUrl);
    }

    await prisma.otherItem.delete({
      where: { id },
    });

    res.json({ message: "Other item deleted successfully" });
  } catch (error) {
    console.error("Error deleting other item:", error);
    res.status(500).json({ error: "Failed to delete other item" });
  }
};

const getAllOtherItems = async (req, res) => {
  try {
    const otherItems = await prisma.otherItem.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Add the /uploads/ prefix to image URLs
    const itemsWithImageUrls = otherItems.map((item) => ({
      ...item,
      imageUrl: `/uploads/${item.imageUrl}`,
    }));

    res.json(itemsWithImageUrls);
  } catch (error) {
    console.error("Error fetching other items:", error);
    res.status(500).json({ error: "Failed to fetch other items" });
  }
};

export { addOtherItem, updateOtherItem, deleteOtherItem, getAllOtherItems };
