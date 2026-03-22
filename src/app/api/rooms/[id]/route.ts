import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as {
      name?: string;
      floor?: string;
      building?: string;
    };

    const room = await db.room.update({
      where: { id: params.id },
      data: {
        ...(body.name     ? { name:     body.name.trim()     } : {}),
        ...(body.floor    ? { floor:    body.floor.trim()    } : {}),
        ...(body.building ? { building: body.building.trim() } : {}),
      },
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error("[PUT /api/rooms/:id]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ลบ records ของห้องก่อน
    await db.meterRecord.deleteMany({ where: { roomId: params.id } });
    await db.room.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/rooms/:id]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}