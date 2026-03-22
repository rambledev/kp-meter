import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const rooms = await db.room.findMany({
      orderBy: [{ building: "asc" }, { floor: "asc" }, { id: "asc" }],
      include: {
        records: {
          orderBy: { recordedAt: "desc" },
          take: 2,
        },
      },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("[GET /api/rooms]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string;
      name: string;
      floor: string;
      building: string;
    };

    if (!body.id?.trim() || !body.name?.trim()) {
      return NextResponse.json({ error: "id และ name จำเป็นต้องระบุ" }, { status: 400 });
    }

    const exists = await db.room.findUnique({ where: { id: body.id.trim() } });
    if (exists) {
      return NextResponse.json({ error: "รหัสห้องนี้มีอยู่แล้ว" }, { status: 409 });
    }

    const room = await db.room.create({
      data: {
        id:       body.id.trim().toUpperCase(),
        name:     body.name.trim(),
        floor:    body.floor.trim()    || "1",
        building: body.building.trim() || "A",
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("[POST /api/rooms]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}