"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Upload,
  X,
  Camera,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_ROOMS,
  saveRecord,
  getLatestRecordByRoom,
  generateId,
} from "@/lib/storage";
import type { MeterRecord } from "@/types";

type Step = "form" | "success";

function ScanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [meterValue, setMeterValue] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [savedRecord, setSavedRecord] = useState<MeterRecord | null>(null);

  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) setSelectedRoomId(roomParam);
  }, [searchParams]);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        setImagePreview(result);
        setImageDataUrl(result);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    setImageDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(() => {
    setError("");
    if (!selectedRoomId) {
      setError("กรุณาเลือกห้องก่อน");
      return;
    }
    const numValue = parseFloat(meterValue);
    if (!meterValue || isNaN(numValue) || numValue < 0) {
      setError("กรุณากรอกเลขมิเตอร์ให้ถูกต้อง");
      return;
    }
    const room = MOCK_ROOMS.find((r) => r.id === selectedRoomId);
    if (!room) return;

    const latest = getLatestRecordByRoom(selectedRoomId);
    const previousValue = latest?.value ?? null;
    const units =
      previousValue !== null && numValue > previousValue
        ? Math.round((numValue - previousValue) * 10) / 10
        : null;

    const record: MeterRecord = {
      id: generateId(),
      roomId: selectedRoomId,
      roomName: room.name,
      value: numValue,
      previousValue,
      units,
      imageDataUrl,
      recordedAt: new Date().toISOString(),
      note: note.trim(),
    };

    saveRecord(record);
    setSavedRecord(record);
    setStep("success");
  }, [selectedRoomId, meterValue, note, imageDataUrl]);

  const handleReset = useCallback(() => {
    setStep("form");
    setSelectedRoomId("");
    setMeterValue("");
    setNote("");
    setImagePreview(null);
    setImageDataUrl(null);
    setError("");
    setSavedRecord(null);
  }, []);

  if (step === "success" && savedRecord) {
    return (
      <SuccessScreen
        record={savedRecord}
        onReset={handleReset}
        onHome={() => router.push("/")}
      />
    );
  }

  const selectedRoom = MOCK_ROOMS.find((r) => r.id === selectedRoomId);
  const latestRecord = selectedRoomId
    ? getLatestRecordByRoom(selectedRoomId)
    : null;
  const currentNum = parseFloat(meterValue);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/50">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-tight">บันทึกมิเตอร์</h1>
          {selectedRoom && (
            <p className="text-xs text-muted-foreground">
              ห้อง {selectedRoom.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5 pb-6 flex-1">
        {/* 1: Room */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <StepBadge n={1} />
            เลือกห้อง
          </Label>
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger
              className={!selectedRoomId ? "text-muted-foreground" : ""}
            >
              <SelectValue placeholder="เลือกห้องที่ต้องการบันทึก..." />
            </SelectTrigger>
            <SelectContent>
              {["ชั้น 1", "ชั้น 2"].map((floor) => (
                <SelectGroup key={floor}>
                  <SelectLabel>{floor}</SelectLabel>
                  {MOCK_ROOMS.filter((r) => r.floor === floor).map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      ห้อง {room.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {latestRecord && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              ค่ามิเตอร์ล่าสุด:{" "}
              <span className="font-mono font-semibold text-foreground">
                {latestRecord.value.toLocaleString()}
              </span>{" "}
              หน่วย
            </p>
          )}
        </div>

        {/* 2: Image */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <StepBadge n={2} />
            ถ่ายรูปมิเตอร์{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (ไม่บังคับ)
            </span>
          </Label>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="meter"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-muted/40 hover:bg-muted/60 active:scale-98 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">อัปโหลดรูปมิเตอร์</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  แตะเพื่อเลือกรูป
                </p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />

          {!imagePreview && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              เลือกรูปจากคลัง
            </Button>
          )}
        </div>

        {/* 3: Meter value */}
        <div className="space-y-2">
          <Label
            htmlFor="meter-value"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            <StepBadge n={3} />
            เลขมิเตอร์
          </Label>
          <Input
            id="meter-value"
            type="number"
            inputMode="decimal"
            placeholder="เช่น 1234.5"
            value={meterValue}
            onChange={(e) => setMeterValue(e.target.value)}
            className="text-xl font-mono font-semibold text-center h-14"
          />
          {latestRecord && meterValue && !isNaN(currentNum) && (
            <p className="text-xs text-center">
              {currentNum > latestRecord.value ? (
                <span className="text-emerald-600 font-medium">
                  ใช้ไป{" "}
                  {(currentNum - latestRecord.value).toFixed(1)} หน่วย
                </span>
              ) : currentNum === latestRecord.value ? (
                <span className="text-muted-foreground">ค่าเท่าเดิม</span>
              ) : (
                <span className="text-amber-600">
                  ค่าน้อยกว่าครั้งก่อน — กรุณาตรวจสอบ
                </span>
              )}
            </p>
          )}
        </div>

        {/* 4: Note */}
        <div className="space-y-2">
          <Label
            htmlFor="note"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            <StepBadge n={4} secondary />
            หมายเหตุ{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (ไม่บังคับ)
            </span>
          </Label>
          <Input
            id="note"
            type="text"
            placeholder="เช่น มิเตอร์ชำรุด, บันทึกล่าช้า..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-auto pt-2">
          <Button
            size="xl"
            className="w-full gap-2 shadow-lg shadow-primary/25"
            onClick={handleSubmit}
          >
            <CheckCircle2 className="w-5 h-5" />
            ยืนยันบันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepBadge({
  n,
  secondary,
}: {
  n: number;
  secondary?: boolean;
}) {
  return (
    <span
      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
        secondary
          ? "bg-secondary text-secondary-foreground"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {n}
    </span>
  );
}

interface SuccessScreenProps {
  record: MeterRecord;
  onReset: () => void;
  onHome: () => void;
}

function SuccessScreen({ record, onReset, onHome }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 text-center gap-5">
      <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold">บันทึกสำเร็จ!</h2>
        <p className="text-muted-foreground text-sm mt-1">
          ห้อง {record.roomName} ·{" "}
          {new Date(record.recordedAt).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-3 text-left shadow-sm">
        <SummaryRow label="ห้อง" value={record.roomName} />
        <SummaryRow
          label="เลขมิเตอร์"
          value={
            <span className="font-mono font-bold text-lg">
              {record.value.toLocaleString()}
            </span>
          }
        />
        {record.units !== null && (
          <SummaryRow
            label="ใช้ไป"
            value={
              <span className="font-semibold text-emerald-600">
                {record.units} หน่วย
              </span>
            }
          />
        )}
        {record.note && <SummaryRow label="หมายเหตุ" value={record.note} />}
      </div>

      <div className="flex flex-col gap-3 w-full mt-2">
        <Button size="lg" onClick={onReset} className="w-full gap-2">
          <Camera className="w-4 h-4" />
          บันทึกห้องถัดไป
        </Button>
        <Button size="lg" variant="outline" onClick={onHome} className="w-full">
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold text-sm">{value}</span>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
          กำลังโหลด...
        </div>
      }
    >
      <ScanForm />
    </Suspense>
  );
}
