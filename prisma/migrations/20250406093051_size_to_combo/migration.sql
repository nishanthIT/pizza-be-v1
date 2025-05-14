/*
  Warnings:

  - Added the required column `size` to the `ComboPizza` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComboPizza" ADD COLUMN     "size" TEXT NOT NULL;
