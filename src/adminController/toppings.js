import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const addTopping = async (req, res) => {
  try {
    const { name, price } = req.body;

    const addTopping = await prisma.toppingsList.create({
      data: {
        name: name,
        price: price,
      },
    });
    return res
      .status(201)
      .json({ message: "Topping added successfully", data: addTopping });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTopping = async (req, res) => {
  try {
    const { id, name, price } = req.body;

    const checkTopping = await prisma.toppingsList.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkTopping) {
      return res.status(404).json({ message: "Topping not found" });
    }

    const updateTopping = await prisma.toppingsList.update({
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

const updateStatusinTopping = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Topping ID is required" });
    }

    if (typeof status !== "boolean") {
      return res
        .status(400)
        .json({ message: "Invalid status value. Must be a boolean." });
    }

    const checkTopping = await prisma.toppingsList.findUnique({
      where: {
        id: id,
      },
    });
    if (!checkTopping) {
      return res.status(404).json({ message: "Topping not found" });
    }
    const updateStatus = await prisma.toppingsList.update({
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

const deleteTopping = async (req, res) => {
  try {
    const { id } = req.body;

    const checkTopping = await prisma.toppingsList.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkTopping) {
      return res.status(404).json({ message: "Topping not found" });
    }

    const deleteTopping = await prisma.toppingsList.delete({
      where: {
        id: id,
      },
    });
    return res
      .status(201)
      .json({ message: "Topping deleted successfully", data: deleteTopping });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getToppings = async (req, res) => {
  try {
    const toppings = await prisma.toppingsList.findMany();
    return res
      .status(200)
      .json({ message: "Toppings fetched successfully", data: toppings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  addTopping,
  updateTopping,
  updateStatusinTopping,
  deleteTopping,
  getToppings,
};
