-- CreateTable
CREATE TABLE "ComboOffers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComboOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboPizza" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "pizzaId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ComboPizza_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ComboPizza" ADD CONSTRAINT "ComboPizza_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "ComboOffers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboPizza" ADD CONSTRAINT "ComboPizza_pizzaId_fkey" FOREIGN KEY ("pizzaId") REFERENCES "Pizza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
