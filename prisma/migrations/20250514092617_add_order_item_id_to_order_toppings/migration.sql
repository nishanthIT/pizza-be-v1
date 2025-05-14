/*
  Warnings:

  - You are about to drop the column `oderItemId` on the `OrderToppings` table. All the data in the column will be lost.
  - Added the required column `orderItemId` to the `OrderToppings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderToppings" DROP CONSTRAINT "OrderToppings_oderItemId_fkey";

-- AlterTable
ALTER TABLE "OrderToppings" DROP COLUMN "oderItemId",
ADD COLUMN     "orderItemId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderToppings" ADD CONSTRAINT "OrderToppings_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
