// const { PrismaClient } = require("@prisma/client");
// const pizzaData = require("./pizza.json");

// const prisma = new PrismaClient();

// async function main() {
//   // Clear existing data
//   await prisma.orderItem.deleteMany();
//   await prisma.order.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.admin.deleteMany();
//   await prisma.toppings.deleteMany();
//   await prisma.ingredients.deleteMany();
//   await prisma.defaultToppings.deleteMany();
//   await prisma.defaultIngredients.deleteMany();
//   await prisma.pizza.deleteMany();

//   // Process each category
//   for (const category of pizzaData) {
//     // Process each pizza in the category
//     for (const pizza of category.items) {
//       // Create the pizza
//       const createdPizza = await prisma.pizza.create({
//         data: {
//           name: pizza.title,
//           description: pizza.decs,
//           price: parseInt(pizza.price),
//           imageUrl: pizza.img,
//           category: category.title,
//           sizes: "SMALL", // Default size
//           DefaultToppings: {
//             create: pizza.toppings.map((topping) => ({
//               name: topping.name,
//               price: topping.price,
//               quantity: topping.quantity,
//               include: topping.included,
//             })),
//           },
//           DefaultIngredients: {
//             create: pizza.ingredients.map((ingredient) => ({
//               name: ingredient.name,
//               price: ingredient.price,
//               quantity: ingredient.quantity,
//               include: ingredient.included,
//             })),
//           },
//         },
//       });
//     }
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
