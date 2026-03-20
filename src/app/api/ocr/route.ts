import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json() as { imageBase64: string };

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // ตัด prefix "data:image/jpeg;base64," ออก
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `อ่านตัวเลขบนหน้าปัดมิเตอร์ไฟฟ้าในภาพนี้
ตอบเฉพาะตัวเลขเท่านั้น ไม่มีคำอธิบาย ไม่มีหน่วย
ถ้ามีทศนิยมให้ใส่จุดทศนิยมด้วย เช่น 1234.5
ถ้าอ่านไม่ได้ให้ตอบว่า ERROR`,
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "ERROR";

    // validate ว่าเป็นตัวเลขจริง
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);

    if (isNaN(num) || raw === "ERROR") {
      return NextResponse.json({ value: null, error: "อ่านค่าไม่ได้" });
    }

    return NextResponse.json({ value: num });
  } catch (err) {
    console.error("[POST /api/ocr]", err);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}