"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoomCard } from "@/components/RoomCard";
import { MOCK_ROOMS, getLatestRecordByRoom } from "@/lib/storage";
import type { MeterRecord } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [latestRecords, setLatestRecords] = useState<
    Record<string, MeterRecord | null>
  >({});

  useEffect(() => {
    const records: Record<string, MeterRecord | null> = {};
    for (const room of MOCK_ROOMS) {
      records[room.id] = getLatestRecordByRoom(room.id);
    }
    setLatestRecords(records);
  }, []);

  const totalRooms = MOCK_ROOMS.length;
  const recordedRooms = Object.values(latestRecords).filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-primary px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">KP Meter</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold mt-2">หอพัก KP</h1>
        <p className="text-white/70 text-sm mt-0.5">
          บันทึกแล้ว {recordedRooms}/{totalRooms} ห้อง
        </p>

        {/* Progress bar */}
        <div className="mt-3 bg-white/20 rounded-full h-1.5">
          <div
            className="bg-white rounded-full h-1.5 transition-all duration-500"
            style={{
              width: totalRooms > 0 ? `${(recordedRooms / totalRooms) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 -mt-5">
        <Button
          size="lg"
          className="w-full shadow-lg shadow-primary/30 gap-2"
          onClick={() => router.push("/scan")}
        >
          <ScanLine className="w-5 h-5" />
          บันทึกมิเตอร์ใหม่
        </Button>
      </div>

      {/* Room list */}
      <div className="px-4 mt-5 flex-1">
        <PageHeader
          title="รายการห้อง"
          subtitle="แตะที่ห้องเพื่อบันทึกมิเตอร์"
        />

        <div className="flex flex-col gap-3 mt-2 pb-4">
          {MOCK_ROOMS.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              latestRecord={latestRecords[room.id] ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
