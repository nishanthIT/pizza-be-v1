import { PrismaClient } from "@prisma/client";
import { deleteFile, renameFileToMatchId } from "../utils/fileUtils.js";
import { calculateComboPrice } from "../utils/calculateComboPrice.js";

const prisma = new PrismaClient();

export const addComboOffer = async (req, res) => {
  let tempImageUrl = req.file?.filename || "dummy.png";

  try {
    const { name, description, discount, pizzas } = req.body;

    // Validate required fields
    if (!name || !description || discount === undefined || !pizzas) {
      if (req.file) deleteFile(tempImageUrl);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse and validate pizzas
    const parsedPizzas =
      typeof pizzas === "string" ? JSON.parse(pizzas) : pizzas;

    if (!Array.isArray(parsedPizzas)) {
      if (req.file) deleteFile(tempImageUrl);
      return res.status(400).json({ error: "Pizzas must be an array" });
    }

    // Validate each pizza
    for (const pizza of parsedPizzas) {
      if (!pizza.pizzaId || !pizza.quantity || !pizza.size) {
        if (req.file) deleteFile(tempImageUrl);
        return res.status(400).json({
          error: "Each pizza must have pizzaId, quantity, and size",
        });
      }

      // Validate quantity is a positive integer
      if (
        isNaN(pizza.quantity) ||
        pizza.quantity <= 0 ||
        !Number.isInteger(Number(pizza.quantity))
      ) {
        if (req.file) deleteFile(tempImageUrl);
        return res.status(400).json({
          error: "Quantity must be a positive integer",
        });
      }
    }

    // Calculate final price
    const finalPrice = await calculateComboPrice(
      parsedPizzas,
      Number(discount)
    );

    const combo = await prisma.$transaction(async (tx) => {
      // Create the combo offer
      const newCombo = await tx.comboOffers.create({
        data: {
          name,
          description,
          discount: Number(discount),
          price: finalPrice,
          imageUrl: tempImageUrl,
        },
      });

      // Rename uploaded file if not using dummy image
      if (tempImageUrl !== "dummy.png") {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          newCombo.id,
          "combo"
        );

        if (newImageUrl) {
          await tx.comboOffers.update({
            where: { id: newCombo.id },
            data: { imageUrl: newImageUrl },
          });
          newCombo.imageUrl = newImageUrl;
        }
      }

      // Create combo pizza relationships
      await tx.comboPizza.createMany({
        data: parsedPizzas.map((pizza) => ({
          comboId: newCombo.id,
          pizzaId: pizza.pizzaId,
          quantity: Number(pizza.quantity),
          size: pizza.size.toUpperCase(), // Standardize to uppercase
        })),
      });

      return {
        ...newCombo,
        imageUrl: `/uploads/${newCombo.imageUrl}`,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Combo offer added successfully",
      data: combo,
    });
  } catch (error) {
    if (req.file) deleteFile(tempImageUrl);
    console.error("Error adding combo offer:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to add combo offer",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Get Combo Offers
export const getComboOffer = async (req, res) => {
  try {
    const combos = await prisma.comboOffers.findMany({
      include: {
        pizzas: {
          include: {
            pizza: true,
          },
        },
      },
    });

    const combosWithPrice = await Promise.all(
      combos.map(async (combo) => {
        const pizzas = combo.pizzas.map((item) => ({
          pizzaId: item.pizza.id,
          size: item.size,
          quantity: item.quantity,
        }));

        const finalPrice = await calculateComboPrice(pizzas, combo.discount);

        return {
          ...combo,
          price: finalPrice,
          imageUrl: `/uploads/${combo.imageUrl}`,
        };
      })
    );

    res.status(200).json(combosWithPrice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Edit Combo Offer
export const editComboOffer = async (req, res) => {
  try {
    const { id } = req.body; // combo id
    const { name, description, discount, pizzas } = req.body;
    const tempImageUrl = req.file ? req.file.filename : null;

    const existingCombo = await prisma.comboOffers.findUnique({
      where: { id: id },
    });

    if (!existingCombo) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({ error: "Combo Offer not found" });
    }

    // Parse the pizzas string if it's a string
    const parsedPizzas =
      typeof pizzas === "string" ? JSON.parse(pizzas) : pizzas;

    if (!Array.isArray(parsedPizzas)) {
      return res.status(400).json({ error: "Pizzas must be an array" });
    }

    // Validate each pizza has required fields
    for (const pizza of parsedPizzas) {
      if (!pizza.pizzaId || !pizza.quantity || !pizza.size) {
        return res.status(400).json({
          error: "Each pizza must have pizzaId, quantity, and size",
        });
      }
    }

    const finalPrice = await calculateComboPrice(parsedPizzas, discount);

    const updatedCombo = await prisma.$transaction(async (tx) => {
      // If a new image was uploaded, delete the old one
      if (tempImageUrl && existingCombo.imageUrl !== "dummy.png") {
        deleteFile(existingCombo.imageUrl);
      }

      // Update the combo with the new data
      const combo = await tx.comboOffers.update({
        where: { id: id },
        data: {
          name,
          description,
          discount,
          price: finalPrice,
          imageUrl: tempImageUrl || existingCombo.imageUrl,
        },
      });

      // If a new image was uploaded, rename it to match the combo ID
      if (tempImageUrl) {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          combo.id,
          "combo"
        );

        // Update the combo with the new image URL if renaming was successful
        if (newImageUrl) {
          await tx.comboOffers.update({
            where: { id: combo.id },
            data: { imageUrl: newImageUrl },
          });
          combo.imageUrl = newImageUrl;
        }
      }

      // Delete existing combo pizzas
      await tx.comboPizza.deleteMany({
        where: { comboId: id },
      });

      // Create new combo pizzas
      const comboPizzas = parsedPizzas.map((pizza) => ({
        comboId: id,
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return {
        ...combo,
        imageUrl: `/uploads/${combo.imageUrl}`,
        pizzas: parsedPizzas,
      };
    });

    res.status(200).json({ message: "Combo Offer Updated", updatedCombo });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    console.error("Error in editComboOffer:", error);
    res.status(400).json({ error: error.message });
  }
};

export const deleteComboOffer = async (req, res) => {
  try {
    const { comboId } = req.body;

    if (!comboId) {
      return res.status(400).json({ error: "comboId is required" });
    }

    const existingCombo = await prisma.comboOffers.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return res.status(404).json({ error: "Combo Offer not found" });
    }

    // Delete the image file if it's not the default
    if (existingCombo.imageUrl !== "dummy.png") {
      deleteFile(existingCombo.imageUrl);
    }

    await prisma.$transaction(async (tx) => {
      await tx.comboPizza.deleteMany({
        where: { comboId },
      });

      await tx.comboOffers.delete({
        where: { id: comboId },
      });
    });

    res.status(200).json({ message: "Combo Offer Deleted" });
  } catch (error) {
    console.error("Error in deleteComboOffer:", error);
    res.status(400).json({ error: error.message });
  }
};

export const getComboById = async (req, res) => {
  const { id } = req.params;
  try {
    const combo = await prisma.comboOffers.findUnique({
      where: { id: id },
    });

    if (!combo) {
      return res.status(404).json({ error: "Combo Offer not found" });
    }
    res.status(200).json(combo);
  } catch (error) {
    console.error("Error in getComboById:", error);
    res.status(400).json({ error: error.message });
  }
};
