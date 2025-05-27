import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getOtherItemByCategory = async (req, res) => {
  try {
    const { categoryId } = req.query;
    // Check if category exists
    const checkCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!checkCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Fetch items by category
    const otherItems = await prisma.otherItem.findMany({
      where: {
        categoryId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json(otherItems);
  } catch (error) {
    console.error("Error fetching items by category:", error);
    return res.status(500).json({ message: error.message });
  }
};

const getOtherItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const otherItem = await prisma.otherItem.findUnique({
      where: {
        id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!otherItem) {
      return res.status(404).json({ message: "Other item not found" });
    }

    return res.status(200).json(otherItem);
  } catch (error) {
    console.error("Error fetching other item:", error);
    return res.status(500).json({ message: error.message });
  }
};

export { getOtherItemByCategory, getOtherItemById };
