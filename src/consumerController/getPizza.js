import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getPizzabyCategory = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const checkCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });
    if (!checkCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const pizzas = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        pizzas: true,
      },
    });
    return res
      .status(200)
      .json({ message: "Pizzas fetched successfully", data: pizzas });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPizzaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pizza = await prisma.pizza.findUnique({
      where: {
        id: id,
      },
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

    if (!pizza) {
      return res.status(404).json({ message: "Pizza not found" });
    }
    return res
      .status(200)
      .json({ message: "Pizza fetched successfully", data: pizza });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        pizzas: true,
      },
    });
    return res
      .status(200)
      .json({ message: "Categories fetched successfully", data: categories });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllToppings = async (req, res) => {
  try {
    const toppings = await prisma.toppingsList.findMany();
    return res
      .status(200)
      .json({ message: "Toppings fetched successfully", data: toppings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllIngredients = async (req, res) => {
  try {
    const ingredients = await prisma.ingredientsList.findMany();
    return res
      .status(200)
      .json({ message: "Ingredients fetched successfully", data: ingredients });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllPizzaList = async (req, res) => {
  try {
    const pizzas = await prisma.pizza.findMany();
    return res
      .status(200)
      .json({ message: "Pizzas fetched successfully", data: pizzas });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  getPizzabyCategory,
  getPizzaById,
  getAllCategories,
  getAllToppings,
  getAllIngredients,
  getAllPizzaList,
};
