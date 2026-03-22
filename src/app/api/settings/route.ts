import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.settings.upsert({
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
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as {
      hotelName?: string;
      address?: string;
      phone?: string;
      electricRate?: string | number;
      waterRate?: string | number;
    };

    // parse และ validate แต่ละ field
    const electricRate = parseFloat(String(body.electricRate ?? ""));
    const waterRate    = parseFloat(String(body.waterRate    ?? ""));

    if (isNaN(electricRate) || isNaN(waterRate)) {
      return NextResponse.json(
        { error: "electricRate และ waterRate ต้องเป็นตัวเลข" },
        { status: 400 }
      );
    }

    if (!body.hotelName?.trim()) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อหอพัก" },
        { status: 400 }
      );
    }

    const settings = await db.settings.upsert({
      where: { id: 1 },
      update: {
        hotelName:    body.hotelName.trim(),
        address:      body.address?.trim()  ?? "",
        phone:        body.phone?.trim()    ?? "",
        electricRate,
        waterRate,
      },
      create: {
        id: 1,
        hotelName:    body.hotelName.trim(),
        address:      body.address?.trim()  ?? "",
        phone:        body.phone?.trim()    ?? "",
        electricRate,
        waterRate,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[PUT /api/settings]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}