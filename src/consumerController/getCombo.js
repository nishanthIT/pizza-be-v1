import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getAllcomboList = async (req, res) => {
  try {
    const combos = await prisma.comboOffers.findMany({
      include: {
        pizzas: {
          include: {
            pizza: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(combos);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch combos", error });
  }
};
const getComboByIdUser = async (req, res) => {
  const { id } = req.params;

  try {
    const combo = await prisma.comboOffers.findUnique({
      where: { id },
      include: {
        pizzas: {
          include: {
            pizza: true, // Includes full pizza details (name, price, etc.)
          },
        },
      },
    });

    if (!combo) {
      return res.status(404).json({ message: "Combo not found" });
    }

    res.status(200).json(combo);
  } catch (error) {
    console.error("Error fetching combo by id:", error);
    res.status(500).json({ message: "Failed to fetch combo", error });
  }
};

export { getAllcomboList, getComboByIdUser };
