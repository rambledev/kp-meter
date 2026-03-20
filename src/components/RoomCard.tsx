"use client";

import { useRouter } from "next/navigation";
import { Zap, ChevronRight, Clock } from "lucide-react";
import type { Room, MeterRecord } from "@/types";
import { formatShortDate } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  room: Room;
  latestRecord: MeterRecord | null;
}

export function RoomCard({ room, latestRecord }: RoomCardProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-border/60",
        "active:scale-98 transition-transform cursor-pointer"
      )}
      onClick={() => router.push(`/scan?room=${room.id}`)}
    >
      {/* Room label */}
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-base">{room.name}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-semibold text-foreground">ห้อง {room.name}</span>
          <span className="text-xs text-muted-foreground">· {room.floor}</span>
        </div>

        {latestRecord ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-foreground">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono font-semibold">
                {latestRecord.value.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs">หน่วย</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatShortDate(latestRecord.recordedAt)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
}
