import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const addCategory = async (req, res) => {
  try {
    // const adminId = req.params.id;
    const { name, description } = req.body;

    // const checkAdmin = await prisma.admin.findUnique({
    //   where: {
    //     id: adminId,
    //   },
    // });

    // if (!checkAdmin) {
    //   return res.status(404).json({ message: "Admin not found" });
    // }

    const addCategory = await prisma.category.create({
      data: {
        name: name,
        description: description,
      },
    });
    return res
      .status(201)
      .json({ message: "Category added successfully", data: addCategory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id, name, description } = req.body;

    const checkCategory = await prisma.category.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const updateCategory = await prisma.category.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        description: description,
      },
    });
    return res
      .status(201)
      .json({ message: "Category updated successfully", data: updateCategory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const checkCategory = await prisma.category.findUnique({
      where: {
        id: id,
      },
    });

    if (!checkCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const deleteCategory = await prisma.category.delete({
      where: {
        id: id,
      },
    });
    return res
      .status(201)
      .json({ message: "Category deleted successfully", data: deleteCategory });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    return res
      .status(200)
      .json({ message: "Categories fetched successfully", data: categories });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { addCategory, updateCategory, deleteCategory, getCategories };
