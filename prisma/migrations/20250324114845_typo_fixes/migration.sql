/*
  Warnings:

  - You are about to drop the column `created_at` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `cratedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Pizza` table. All the data in the column will be lost.
  - You are about to drop the `Ingredients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Toppings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ingredients" DROP CONSTRAINT "Ingredients_orderItemId_fkey";

-- DropForeignKey
ALTER TABLE "Toppings" DROP CONSTRAINT "Toppings_oderItemId_fkey";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "cratedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Pizza" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Ingredients";

-- DropTable
DROP TABLE "Toppings";

-- CreateTable
CREATE TABLE "OrderToppings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" BOOLEAN NOT NULL,
    "include" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "oderItemId" TEXT NOT NULL,

    CONSTRAINT "OrderToppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIngredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" BOOLEAN NOT NULL,
    "include" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderItemId" TEXT NOT NULL,

    CONSTRAINT "OrderIngredients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderToppings" ADD CONSTRAINT "OrderToppings_oderItemId_fkey" FOREIGN KEY ("oderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIngredients" ADD CONSTRAINT "OrderIngredients_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
