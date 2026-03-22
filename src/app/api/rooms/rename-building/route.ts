import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    const { oldBuilding, newBuilding } = await req.json() as {
      oldBuilding: string;
      newBuilding: string;
    };

    if (!oldBuilding || !newBuilding) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // update ทุกห้องใน building นี้
    await db.room.updateMany({
      where: { building: oldBuilding },
      data:  { building: newBuilding },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/rooms/rename-building]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}