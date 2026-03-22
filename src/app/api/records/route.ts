import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const roomId   = searchParams.get("roomId")   ?? undefined;
    const type     = searchParams.get("type")     ?? undefined;
    const monthStr = searchParams.get("month");
    const yearStr  = searchParams.get("year");
    const search   = searchParams.get("search")   ?? undefined;

    const records = await db.meterRecord.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        ...(type   ? { type: type as "ELECTRIC" | "WATER" } : {}),
        ...(monthStr ? { month: parseInt(monthStr) } : {}),
        ...(yearStr  ? { year:  parseInt(yearStr)  } : {}),
        ...(search   ? {
          OR: [
            { roomId: { contains: search, mode: "insensitive" } },
            { note:   { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: { room: true },   // ← แก้จาก electricRoom เป็น room
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("[GET /api/records]", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

// POST /api/records
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      roomId:   string;
      type:     "ELECTRIC" | "WATER";
      value:    number;
      imageUrl?: string | null;
      note?:    string;
      month:    number;
      year:     number;
    };

    const { roomId, type, value, imageUrl, note, month, year } = body;

    if (!roomId || value == null || isNaN(value)) {
      return NextResponse.json(
        { error: "roomId และ value จำเป็นต้องระบุ" },
        { status: 400 }
      );
    }

    // หาค่ามิเตอร์ครั้งก่อน
    const latest = await db.meterRecord.findFirst({
      where: { roomId, type },
      orderBy: { recordedAt: "desc" },
    });

    const previousValue = latest?.value ?? null;
    const units =
      previousValue !== null && value > previousValue
        ? Math.round((value - previousValue) * 10) / 10
        : null;

    const record = await db.meterRecord.create({
      data: {
        roomId,
        type,
        value,
        previousValue,
        units,
        imageUrl: imageUrl ?? null,
        note:     note?.trim() ?? "",
        month,
        year,
      },
      include: { room: true },   // ← แก้จาก electricRoom เป็น room
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[POST /api/records]", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}