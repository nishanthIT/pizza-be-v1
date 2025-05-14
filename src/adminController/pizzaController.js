import { PrismaClient } from "@prisma/client";
import { deleteFile, renameFileToMatchId } from "../utils/fileUtils.js";

const prisma = new PrismaClient();

const addPizza = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      sizes, // { "SMALL": 15, "MEDIUM": 18, "LARGE": 28 },
      toppings: toppingsStr,
      ingredients: ingredientsStr,
    } = req.body;

    // Parse JSON strings
    const toppings = toppingsStr ? JSON.parse(toppingsStr) : [];
    const ingredients = ingredientsStr ? JSON.parse(ingredientsStr) : [];

    // Check if a file was uploaded
    const tempImageUrl = req.file ? req.file.filename : null;

    const categoryRecord = await prisma.category.findUnique({
      where: { id: category },
    });

    if (!categoryRecord) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({ error: "Category not found" });
    }

    const pizza = await prisma.$transaction(async (tx) => {
      // Create the pizza with the temporary image URL or null
      const newPizza = await tx.pizza.create({
        data: {
          name,
          description,
          imageUrl: tempImageUrl || "dummy.png",
          categoryId: category,
          sizes,
        },
      });

      // If a file was uploaded, rename it to match the pizza ID
      if (tempImageUrl) {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          newPizza.id,
          "pizza"
        );

        // Update the pizza with the new image URL if renaming was successful
        if (newImageUrl) {
          await tx.pizza.update({
            where: { id: newPizza.id },
            data: { imageUrl: newImageUrl },
          });
          newPizza.imageUrl = newImageUrl;
        }
      }

      if (toppings && toppings.length) {
        const toppingRecords = await tx.toppingsList.findMany({
          where: { id: { in: toppings.map((t) => t.id) } },
        });

        if (toppingRecords.length !== toppings.length) {
          throw new Error("Some toppings not found");
        }

        await tx.defaultToppings.createMany({
          data: toppings.map((t) => ({
            name: toppingRecords.find((top) => top.id === t.id).name,
            price: toppingRecords.find((top) => top.id === t.id).price,
            quantity: t.quantity,
            include: true,
            pizzaId: newPizza.id,
            toppingId: t.id,
          })),
        });
      }

      if (ingredients && ingredients.length) {
        const ingredientRecords = await tx.ingredientsList.findMany({
          where: { id: { in: ingredients.map((i) => i.id) } },
        });

        if (ingredientRecords.length !== ingredients.length) {
          throw new Error("Some ingredients not found");
        }

        await tx.defaultIngredients.createMany({
          data: ingredients.map((i) => ({
            name: ingredientRecords.find((ing) => ing.id === i.id).name,
            price: ingredientRecords.find((ing) => ing.id === i.id).price,
            quantity: i.quantity,
            include: true,
            pizzaId: newPizza.id,
            ingredientId: i.id,
          })),
        });
      }

      return {
        ...newPizza,
        imageUrl: `/uploads/${newPizza.imageUrl}`,
      };
    });

    return res.status(201).json({ message: "Pizza added successfully", pizza });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    console.error("Error adding pizza:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updatePizza = async (req, res) => {
  try {
    const {
      pizzaId,
      name,
      description,
      category,
      sizes,
      toppings: toppingsStr,
      ingredients: ingredientsStr,
    } = req.body;

    // Parse JSON strings
    const toppings = toppingsStr ? JSON.parse(toppingsStr) : [];
    const ingredients = ingredientsStr ? JSON.parse(ingredientsStr) : [];

    const tempImageUrl = req.file ? req.file.filename : null;

    const existingPizza = await prisma.pizza.findUnique({
      where: { id: pizzaId },
    });

    if (!existingPizza) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({ error: "Pizza not found" });
    }

    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { id: category },
      });
      if (!categoryRecord) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const updatedPizza = await prisma.$transaction(async (tx) => {
      // If a new image was uploaded, delete the old one
      if (tempImageUrl && existingPizza.imageUrl !== "dummy.png") {
        deleteFile(existingPizza.imageUrl);
      }

      // Update the pizza with the new data
      const pizza = await tx.pizza.update({
        where: { id: pizzaId },
        data: {
          name,
          description,
          imageUrl: tempImageUrl || existingPizza.imageUrl,
          categoryId: category || existingPizza.categoryId,
          sizes: sizes || existingPizza.sizes,
        },
      });

      // If a new image was uploaded, rename it to match the pizza ID
      if (tempImageUrl) {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          pizza.id,
          "pizza"
        );

        // Update the pizza with the new image URL if renaming was successful
        if (newImageUrl) {
          await tx.pizza.update({
            where: { id: pizza.id },
            data: { imageUrl: newImageUrl },
          });
          pizza.imageUrl = newImageUrl;
        }
      }

      if (toppings) {
        await tx.defaultToppings.deleteMany({ where: { pizzaId } });

        const toppingRecords = await tx.toppingsList.findMany({
          where: { id: { in: toppings.map((t) => t.id) } },
        });

        if (toppingRecords.length !== toppings.length) {
          throw new Error("Some toppings not found");
        }

        await tx.defaultToppings.createMany({
          data: toppings.map((t) => ({
            name: toppingRecords.find((top) => top.id === t.id).name,
            price: toppingRecords.find((top) => top.id === t.id).price,
            quantity: t.quantity,
            include: true,
            pizzaId: pizza.id,
            toppingId: t.id,
          })),
        });
      }

      if (ingredients) {
        await tx.defaultIngredients.deleteMany({ where: { pizzaId } });

        const ingredientRecords = await tx.ingredientsList.findMany({
          where: { id: { in: ingredients.map((i) => i.id) } },
        });

        if (ingredientRecords.length !== ingredients.length) {
          throw new Error("Some ingredients not found");
        }

        await tx.defaultIngredients.createMany({
          data: ingredients.map((i) => ({
            name: ingredientRecords.find((ing) => ing.id === i.id).name,
            price: ingredientRecords.find((ing) => ing.id === i.id).price,
            quantity: i.quantity,
            include: true,
            pizzaId: pizza.id,
            ingredientId: i.id,
          })),
        });
      }

      return {
        ...pizza,
        imageUrl: `/uploads/${pizza.imageUrl}`,
      };
    });

    return res
      .status(200)
      .json({ message: "Pizza updated successfully", updatedPizza });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    console.error("Error updating pizza:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deletePizza = async (req, res) => {
  try {
    const { pizzaId } = req.body;

    const existingPizza = await prisma.pizza.findUnique({
      where: { id: pizzaId },
    });

    if (!existingPizza) {
      return res.status(404).json({ error: "Pizza not found" });
    }

    // Delete the image file if it's not the default
    if (existingPizza.imageUrl !== "dummy.png") {
      deleteFile(existingPizza.imageUrl);
    }

    await prisma.$transaction(async (tx) => {
      await tx.defaultToppings.deleteMany({ where: { pizzaId } });
      await tx.defaultIngredients.deleteMany({ where: { pizzaId } });
      await tx.pizza.delete({ where: { id: pizzaId } });
    });

    return res.status(200).json({ message: "Pizza deleted successfully" });
  } catch (error) {
    console.error("Error deleting pizza:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllPizzas = async (req, res) => {
  try {
    const pizzas = await prisma.pizza.findMany({
      include: {
        category: true,
        defaultToppings: {
          include: { topping: true },
        },
        defaultIngredients: {
          include: { ingredient: true },
        },
      },
    });

    // Add the /uploads/ prefix to image URLs
    const pizzasWithImageUrls = pizzas.map((pizza) => ({
      ...pizza,
      imageUrl: pizza.imageUrl ? `/uploads/${pizza.imageUrl}` : null,
    }));

    return res.status(200).json({
      message: "Pizzas retrieved successfully",
      pizzas: pizzasWithImageUrls,
    });
  } catch (error) {
    console.error("Error fetching pizzas:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { addPizza, updatePizza, deletePizza, getAllPizzas };
