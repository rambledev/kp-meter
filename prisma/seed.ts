import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOMS = [
  { id: "A101", name: "A101", floor: "1", building: "A" },
  { id: "A102", name: "A102", floor: "1", building: "A" },
  { id: "A103", name: "A103", floor: "1", building: "A" },
  { id: "A201", name: "A201", floor: "2", building: "A" },
  { id: "A202", name: "A202", floor: "2", building: "A" },
  { id: "A203", name: "A203", floor: "2", building: "A" },
  { id: "B101", name: "B101", floor: "1", building: "B" },
  { id: "B102", name: "B102", floor: "1", building: "B" },
  { id: "B201", name: "B201", floor: "2", building: "B" },
  { id: "B202", name: "B202", floor: "2", building: "B" },
];

async function main() {
  console.log("🌱 Seeding...");

  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: {},
      create: room,
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hotelName: "หอพัก KP",
      address: "",
      phone: "",
      electricRate: 8.0,
      waterRate: 18.0,
    },
  });

  console.log("✅ Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());