"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, Upload, X, Camera, ArrowLeft,
  AlertCircle, Loader2, RefreshCw, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MOCK_ROOMS, saveRecord, getLatestRecordByRoom, generateId,
} from "@/lib/storage";
import type { MeterRecord } from "@/types";

type Step = "form" | "success";
type OcrState = "idle" | "reading" | "confirm" | "error";

const FRAME_W_RATIO = 0.85;
const FRAME_H_RATIO = 0.38;

// ─── Crop รูปเฉพาะในกรอบ viewfinder ─────────────────────────────────────────
function cropToViewfinder(
  imageDataUrl: string,
  containerW: number,
  containerH: number,
  frameW: number,
  frameH: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / containerW;
      const scaleY = img.naturalHeight / containerH;
      const offsetX = (containerW - frameW) / 2;
      const offsetY = (containerH - frameH) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = frameW * scaleX;
      canvas.height = frameH * scaleY;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        offsetX * scaleX, offsetY * scaleY,
        frameW * scaleX, frameH * scaleY,
        0, 0, canvas.width, canvas.height
      );
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = imageDataUrl;
  });
}

// ─── ViewfinderFrame (มุมสีส้ม) ──────────────────────────────────────────────
function ViewfinderFrame({ wRatio, hRatio }: { wRatio: number; hRatio: number }) {
  const left = `${(1 - wRatio) / 2 * 100}%`;
  const top  = `${(1 - hRatio) / 2 * 100}%`;
  const w    = `${wRatio * 100}%`;
  const h    = `${hRatio * 100}%`;
  const corner = "w-5 h-5 border-primary";
  return (
    <div className="absolute" style={{ left, top, width: w, height: h }}>
      <div className="absolute inset-0 border border-white/20 rounded-sm" />
      <div className={`absolute top-0 left-0 border-t-2 border-l-2 rounded-tl-sm ${corner}`} />
      <div className={`absolute top-0 right-0 border-t-2 border-r-2 rounded-tr-sm ${corner}`} />
      <div className={`absolute bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm ${corner}`} />
      <div className={`absolute bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm ${corner}`} />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/20" />
    </div>
  );
}

// ─── Overlay มืด 4 ด้าน ───────────────────────────────────────────────────────
function ViewfinderOverlay() {
  const vPad = `${(1 - FRAME_H_RATIO) / 2 * 100}%`;
  const hPad = `${(1 - FRAME_W_RATIO) / 2 * 100}%`;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
      <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, left: 0, width: hPad }} />
      <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, right: 0, width: hPad }} />
      <ViewfinderFrame wRatio={FRAME_W_RATIO} hRatio={FRAME_H_RATIO} />
    </div>
  );
}

// ─── Camera Modal (getUserMedia) ──────────────────────────────────────────────
interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [permissionError, setPermissionError] = useState("");

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch (err) {
        if (!active) return;
        const e = err as DOMException;
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setPermissionError("ไม่ได้รับอนุญาตให้ใช้กล้อง\nกรุณาอนุญาตในการตั้งค่าเบราว์เซอร์");
        } else if (e.name === "NotFoundError") {
          setPermissionError("ไม่พบกล้องในอุปกรณ์นี้");
        } else {
          setPermissionError("เปิดกล้องไม่ได้: " + e.message);
        }
      }
    }

    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `meter-${Date.now()}.jpg`, { type: "image/jpeg" });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(file);
    }, "image/jpeg", 0.92);
  }, [ready, onCapture]);

  const handleClose = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <p className="text-white text-sm font-medium">วางมิเตอร์ในกรอบ</p>
        <div className="w-10" />
      </div>

      {/* Video area */}
      <div className="relative flex-1 overflow-hidden">
        {permissionError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-white/80 text-sm whitespace-pre-line">{permissionError}</p>
            <p className="text-white/50 text-xs">
              ไปที่ Settings → Privacy → Camera → อนุญาตเบราว์เซอร์
            </p>
            <Button
              variant="outline" size="sm" onClick={handleClose}
              className="border-white/30 text-white hover:bg-white/10"
            >
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {ready && <ViewfinderOverlay />}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            {/* hint */}
            {ready && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  วางตัวเลขมิเตอร์ให้อยู่ในกรอบสีส้ม
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ปุ่มถ่าย */}
      {!permissionError && (
        <div className="flex items-center justify-center py-8">
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="rounded-full border-4 border-white flex items-center justify-center
                       disabled:opacity-40 active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── OCR Confirm Modal ────────────────────────────────────────────────────────
interface OcrConfirmProps {
  croppedImage: string;
  ocrValue: number | null;
  ocrError: string;
  ocrState: OcrState;
  onConfirm: (value: number) => void;
  onRetake: () => void;
  onRetry: () => void;
}

function OcrConfirmModal({
  croppedImage, ocrValue, ocrError, ocrState,
  onConfirm, onRetake, onRetry,
}: OcrConfirmProps) {
  const [editValue, setEditValue] = useState(ocrValue?.toString() ?? "");

  useEffect(() => {
    if (ocrValue !== null) setEditValue(ocrValue.toString());
  }, [ocrValue]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-3xl p-5 space-y-4
                      animate-in slide-in-from-bottom duration-300">

        {/* รูป crop */}
        <div className="rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={croppedImage} alt="cropped meter" className="w-full h-32 object-cover" />
        </div>

        {/* Loading */}
        {ocrState === "reading" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">กำลังอ่านค่ามิเตอร์...</p>
          </div>
        )}

        {/* Error */}
        {ocrState === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">{ocrError}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onRetake}>
                <RefreshCw className="w-3.5 h-3.5" /> ถ่ายใหม่
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={onRetry}>
                <Loader2 className="w-3.5 h-3.5" /> ลองอีกครั้ง
              </Button>
            </div>
          </div>
        )}

        {/* Confirm */}
        {ocrState === "confirm" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-0.5">ค่ามิเตอร์ที่อ่านได้</p>
              <p className="text-xs text-muted-foreground mb-2">ตรวจสอบและแก้ไขได้ก่อนยืนยัน</p>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-2xl font-mono font-bold text-center h-16 pr-10"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={onRetake}>
                <RefreshCw className="w-4 h-4" /> ถ่ายใหม่
              </Button>
              <Button
                size="lg" className="flex-1 gap-2"
                onClick={() => { const n = parseFloat(editValue); if (!isNaN(n)) onConfirm(n); }}
                disabled={isNaN(parseFloat(editValue))}
              >
                <CheckCircle2 className="w-4 h-4" /> ยืนยัน
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Viewfinder Picker ────────────────────────────────────────────────────────
interface ViewfinderProps {
  imagePreview: string | null;
  onImageReady: (cropped: string, original: string) => void;
  onRemove: () => void;
}

function ViewfinderPicker({ imagePreview, onImageReady, onRemove }: ViewfinderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const original = evt.target?.result as string;
      const container = containerRef.current;
      if (!container) { onImageReady(original, original); return; }
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const cropped = await cropToViewfinder(
        original, cW, cH,
        cW * FRAME_W_RATIO, cH * FRAME_H_RATIO
      );
      onImageReady(cropped, original);
    };
    reader.readAsDataURL(file);
  }, [onImageReady]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  const handleCameraCapture = useCallback((file: File) => {
    setShowCamera(false);
    processFile(file);
  }, [processFile]);

  const vPad = `${(1 - FRAME_H_RATIO) / 2 * 100}%`;
  const hPad = `${(1 - FRAME_W_RATIO) / 2 * 100}%`;

  return (
    <>
      <div className="space-y-2">
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden bg-gray-900"
          style={{ height: 220 }}
        >
          {imagePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="meter" className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
                <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, left: 0, width: hPad }} />
                <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, right: 0, width: hPad }} />
                <ViewfinderFrame wRatio={FRAME_W_RATIO} hRatio={FRAME_H_RATIO} />
              </div>
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60
                           flex items-center justify-center z-10"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  วางมิเตอร์ให้อยู่ในกรอบสีส้ม
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Camera className="w-8 h-8 text-white/40" />
                <p className="text-white/50 text-xs">วางมิเตอร์ให้อยู่ในกรอบ</p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bg-black/40" style={{ height: vPad }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/40" style={{ height: vPad }} />
                <div className="absolute bg-black/40" style={{ top: vPad, bottom: vPad, left: 0, width: hPad }} />
                <div className="absolute bg-black/40" style={{ top: vPad, bottom: vPad, right: 0, width: hPad }} />
                <ViewfinderFrame wRatio={FRAME_W_RATIO} hRatio={FRAME_H_RATIO} />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2"
            onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> เลือกจากคลัง
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2"
            onClick={() => setShowCamera(true)}>
            <Camera className="w-4 h-4" /> ถ่ายรูป
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}

// ─── ScanForm ─────────────────────────────────────────────────────────────────
function ScanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("form");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [meterValue, setMeterValue] = useState("");
  const [note, setNote] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedRecord, setSavedRecord] = useState<MeterRecord | null>(null);

  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [ocrValue, setOcrValue] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState("");
  const [showOcrModal, setShowOcrModal] = useState(false);

  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) setSelectedRoomId(roomParam);
  }, [searchParams]);

  const runOcr = useCallback(async (imageBase64: string) => {
    setOcrState("reading");
    setOcrError("");
    setShowOcrModal(true);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json() as { value?: number; error?: string };
      if (data.value !== undefined && data.value !== null) {
        setOcrValue(data.value);
        setOcrState("confirm");
      } else {
        setOcrError(data.error ?? "อ่านค่าไม่ได้ กรุณากรอกเอง");
        setOcrState("error");
      }
    } catch {
      setOcrError("เชื่อมต่อไม่ได้ กรุณากรอกเอง");
      setOcrState("error");
    }
  }, []);

  const handleImageReady = useCallback((cropped: string, original: string) => {
    setImagePreview(original);
    setCroppedDataUrl(cropped);
    runOcr(cropped);
  }, [runOcr]);

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    setCroppedDataUrl(null);
    setOcrState("idle");
    setOcrValue(null);
    setShowOcrModal(false);
  }, []);

  const handleOcrConfirm = useCallback((value: number) => {
    setMeterValue(value.toString());
    setShowOcrModal(false);
    setOcrState("idle");
  }, []);

  const handleRetake = useCallback(() => {
    setImagePreview(null);
    setCroppedDataUrl(null);
    setOcrState("idle");
    setOcrValue(null);
    setShowOcrModal(false);
  }, []);

  const handleRetryOcr = useCallback(() => {
    if (croppedDataUrl) runOcr(croppedDataUrl);
  }, [croppedDataUrl, runOcr]);

  const handleSubmit = useCallback(() => {
    setError("");
    if (!selectedRoomId) { setError("กรุณาเลือกห้องก่อน"); return; }
    const numValue = parseFloat(meterValue);
    if (!meterValue || isNaN(numValue) || numValue < 0) {
      setError("กรุณากรอกเลขมิเตอร์ให้ถูกต้อง"); return;
    }
    const room = MOCK_ROOMS.find((r) => r.id === selectedRoomId);
    if (!room) return;

    const latest = getLatestRecordByRoom(selectedRoomId);
    const previousValue = latest?.value ?? null;
    const units =
      previousValue !== null && numValue > previousValue
        ? Math.round((numValue - previousValue) * 10) / 10 : null;

    const record: MeterRecord = {
      id: generateId(),
      roomId: selectedRoomId,
      roomName: room.name,
      value: numValue,
      previousValue,
      units,
      imageDataUrl: croppedDataUrl,
      recordedAt: new Date().toISOString(),
      note: note.trim(),
    };
    saveRecord(record);
    setSavedRecord(record);
    setStep("success");
  }, [selectedRoomId, meterValue, note, croppedDataUrl]);

  const handleReset = useCallback(() => {
    setStep("form");
    setSelectedRoomId("");
    setMeterValue("");
    setNote("");
    setImagePreview(null);
    setCroppedDataUrl(null);
    setOcrState("idle");
    setOcrValue(null);
    setError("");
    setSavedRecord(null);
  }, []);

  if (step === "success" && savedRecord) {
    return <SuccessScreen record={savedRecord} onReset={handleReset} onHome={() => router.push("/")} />;
  }

  const selectedRoom = MOCK_ROOMS.find((r) => r.id === selectedRoomId);
  const latestRecord = selectedRoomId ? getLatestRecordByRoom(selectedRoomId) : null;
  const currentNum = parseFloat(meterValue);

  return (
    <>
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
              <p className="text-xs text-muted-foreground">ห้อง {selectedRoom.name}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 px-4 pt-5 pb-6 flex-1">
          {/* 1: Room */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={1} /> เลือกห้อง
            </Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className={!selectedRoomId ? "text-muted-foreground" : ""}>
                <SelectValue placeholder="เลือกห้องที่ต้องการบันทึก..." />
              </SelectTrigger>
              <SelectContent>
                {["ชั้น 1", "ชั้น 2"].map((floor) => (
                  <SelectGroup key={floor}>
                    <SelectLabel>{floor}</SelectLabel>
                    {MOCK_ROOMS.filter((r) => r.floor === floor).map((room) => (
                      <SelectItem key={room.id} value={room.id}>ห้อง {room.name}</SelectItem>
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
                </span>{" "}หน่วย
              </p>
            )}
          </div>

          {/* 2: Viewfinder */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={2} />
              ถ่ายรูปมิเตอร์{" "}
              <span className="text-muted-foreground font-normal text-xs">(ไม่บังคับ)</span>
            </Label>
            <ViewfinderPicker
              imagePreview={imagePreview}
              onImageReady={handleImageReady}
              onRemove={handleRemoveImage}
            />
            {ocrState === "reading" && (
              <div className="flex items-center gap-2 text-primary text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังอ่านค่ามิเตอร์...</span>
              </div>
            )}
            {ocrState === "confirm" && meterValue && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>อ่านค่าได้: {meterValue} หน่วย</span>
              </div>
            )}
          </div>

          {/* 3: Meter value */}
          <div className="space-y-2">
            <Label htmlFor="meter-value" className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={3} /> เลขมิเตอร์
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
                    ใช้ไป {(currentNum - latestRecord.value).toFixed(1)} หน่วย
                  </span>
                ) : currentNum === latestRecord.value ? (
                  <span className="text-muted-foreground">ค่าเท่าเดิม</span>
                ) : (
                  <span className="text-amber-600">ค่าน้อยกว่าครั้งก่อน — กรุณาตรวจสอบ</span>
                )}
              </p>
            )}
          </div>

          {/* 4: Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={4} secondary />
              หมายเหตุ{" "}
              <span className="text-muted-foreground font-normal text-xs">(ไม่บังคับ)</span>
            </Label>
            <Input
              id="note"
              type="text"
              placeholder="เช่น มิเตอร์ชำรุด, บันทึกล่าช้า..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

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

      {/* OCR Modal */}
      {showOcrModal && croppedDataUrl && (
        <OcrConfirmModal
          croppedImage={croppedDataUrl}
          ocrValue={ocrValue}
          ocrError={ocrError}
          ocrState={ocrState}
          onConfirm={handleOcrConfirm}
          onRetake={handleRetake}
          onRetry={handleRetryOcr}
        />
      )}
    </>
  );
}

// ─── StepBadge ────────────────────────────────────────────────────────────────
function StepBadge({ n, secondary }: { n: number; secondary?: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
      secondary ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
    }`}>
      {n}
    </span>
  );
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────
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
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-3 text-left shadow-sm">
        <SummaryRow label="ห้อง" value={record.roomName} />
        <SummaryRow
          label="เลขมิเตอร์"
          value={<span className="font-mono font-bold text-lg">{record.value.toLocaleString()}</span>}
        />
        {record.units !== null && (
          <SummaryRow
            label="ใช้ไป"
            value={<span className="font-semibold text-emerald-600">{record.units} หน่วย</span>}
          />
        )}
        {record.note && <SummaryRow label="หมายเหตุ" value={record.note} />}
      </div>
      <div className="flex flex-col gap-3 w-full mt-2">
        <Button size="lg" onClick={onReset} className="w-full gap-2">
          <Camera className="w-4 h-4" /> บันทึกห้องถัดไป
        </Button>
        <Button size="lg" variant="outline" onClick={onHome} className="w-full">
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-semibold text-sm">{value}</span>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        กำลังโหลด...
      </div>
    }>
      <ScanForm />
    </Suspense>
  );
}