-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('ELECTRIC', 'WATER');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT 'A',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_records" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "type" "MeterType" NOT NULL DEFAULT 'ELECTRIC',
    "value" DOUBLE PRECISION NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "units" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "meter_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hotelName" TEXT NOT NULL DEFAULT 'หอพัก',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "electricRate" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "waterRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meter_records_roomId_type_idx" ON "meter_records"("roomId", "type");

-- CreateIndex
CREATE INDEX "meter_records_year_month_idx" ON "meter_records"("year", "month");

-- AddForeignKey
ALTER TABLE "meter_records" ADD CONSTRAINT "meter_records_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
