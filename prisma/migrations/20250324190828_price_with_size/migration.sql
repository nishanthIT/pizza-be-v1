/*
  Warnings:

  - You are about to drop the column `price` on the `Pizza` table. All the data in the column will be lost.
  - Changed the type of `sizes` on the `Pizza` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Pizza" DROP COLUMN "price",
DROP COLUMN "sizes",
ADD COLUMN     "sizes" JSONB NOT NULL;
