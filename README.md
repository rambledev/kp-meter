# KP Meter — ระบบบันทึกมิเตอร์หอพัก

แอปมือถือสำหรับเจ้าของหอพักบันทึกค่ามิเตอร์ไฟฟ้า รวดเร็ว ใช้ง่าย

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS 3.4.x**
- **shadcn/ui** components
- **localStorage** สำหรับเก็บข้อมูล

## Features (MVP)

- 🏠 **หน้าหลัก** — รายการห้องพร้อมค่ามิเตอร์ล่าสุด + progress bar
- 📷 **บันทึก** — เลือกห้อง, อัปโหลดรูป, กรอกเลขมิเตอร์ พร้อมคำนวณหน่วยที่ใช้
- 📋 **ประวัติ** — ดูรายการย้อนหลัง + ค้นหาและ filter ตามห้อง

## Getting Started

```bash
# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) บน browser หรือมือถือในเครือข่ายเดียวกัน

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── layout.tsx          # Root layout + BottomNav
│   ├── globals.css         # CSS variables + Tailwind
│   ├── page.tsx            # หน้าหลัก (room list)
│   ├── scan/
│   │   └── page.tsx        # หน้าบันทึกมิเตอร์
│   └── history/
│       └── page.tsx        # หน้าประวัติ
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   └── PageHeader.tsx
│   ├── RoomCard.tsx
│   └── HistoryItem.tsx
├── lib/
│   ├── storage.ts          # localStorage helpers + mock data
│   └── utils.ts            # cn() utility
└── types/
    └── index.ts            # TypeScript types
```

## ข้อมูล Mock

ห้องทดสอบ: A101–A103, A201–A203, B101–B102, B201–B202

## Roadmap

- [ ] OCR อ่านเลขมิเตอร์อัตโนมัติ
- [ ] Export CSV / รายงานรายเดือน
- [ ] คำนวณค่าไฟ
- [ ] Database (Supabase / PocketBase)
- [ ] ระบบ login สำหรับหลายหอพัก
