import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const addIngredient = async (req, res) => {
  try {
    const { name, price } = req.body;

    const addIngredients = await prisma.ingredientsList.create({
      data: {
        name: name,
        price: price,
      },
    });
    return res
      .status(201)
      .json({ message: "Topping added successfully", data: addIngredients });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateIngredient = async (req, res) => {
  try {
    const { id, name, price } = req.body;

    const checkIngredient = await prisma.ingredientsList.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkIngredient) {
      return res.status(404).json({ message: "Topping not found" });
    }

    const updateTopping = await prisma.ingredientsList.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        price: price,
      },
    });
    return res
      .status(201)
      .json({ message: "Topping updated successfully", data: updateTopping });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateStatusinIngredient = async (req, res) => {
  try {
    const { id, status } = req.body;

    const checkIngredient = await prisma.ingredientsList.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkIngredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    const updateStatus = await prisma.ingredientsList.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });

    return res.status(201).json({
      message: "Topping status updated successfully",
      data: updateStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteIngredient = async (req, res) => {
  try {
    const { id } = req.body;

    const checkIngredient = await prisma.ingredientsList.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkIngredient) {
      return res.status(404).json({ message: "Topping not found" });
    }

    const deleteIngredient = await prisma.ingredientsList.delete({
      where: {
        id: id,
      },
    });
    return res.status(201).json({
      message: "Topping deleted successfully",
      data: deleteIngredient,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getIngredients = async (req, res) => {
  try {
    const ingredients = await prisma.ingredientsList.findMany();
    return res
      .status(200)
      .json({ message: "Toppings fetched successfully", data: ingredients });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  addIngredient,
  updateIngredient,
  updateStatusinIngredient,
  deleteIngredient,
  getIngredients,
};
