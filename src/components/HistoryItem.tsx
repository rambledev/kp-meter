import { Zap, TrendingUp, Image as ImageIcon, Trash2 } from "lucide-react";
import type { MeterRecord } from "@/types";
import { formatDate } from "@/lib/storage";

interface HistoryItemProps {
  record: MeterRecord;
  onDelete?: (id: string) => void;  // ← เปลี่ยนจาก Promise<void> เป็น void
}

export function HistoryItem({ record, onDelete }: HistoryItemProps) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">
              {record.room?.name ?? record.roomId}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">
              ห้อง {record.room?.name ?? record.roomId}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(record.recordedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-mono font-bold text-lg">
                {record.value.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">หน่วย</p>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(record.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         text-muted-foreground hover:text-destructive
                         hover:bg-destructive/10 transition-colors mt-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {record.units !== null && record.units > 0 && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">
            ใช้ไป {record.units} หน่วย
          </span>
          {record.previousValue !== null && (
            <span className="text-xs text-muted-foreground">
              (จาก {record.previousValue.toLocaleString()})
            </span>
          )}
        </div>
      )}

      {record.note && (
        <p className="text-xs text-muted-foreground mt-1.5 italic">
          หมายเหตุ: {record.note}
        </p>
      )}

      {record.imageUrl && (
        <div className="flex items-center gap-1 mt-1.5">
          <ImageIcon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">มีรูปถ่าย</span>
        </div>
      )}
    </div>
  );
}