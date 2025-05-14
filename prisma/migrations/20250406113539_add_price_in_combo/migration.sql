/*
  Warnings:

  - Added the required column `price` to the `ComboOffers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComboOffers" ADD COLUMN     "price" DECIMAL(65,30) NOT NULL;
