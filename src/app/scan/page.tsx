"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, Upload, X, Camera, ArrowLeft,
  AlertCircle, Loader2, RefreshCw, Pencil, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getRooms, saveRecord } from "@/lib/storage";
import type { MeterRecord, RoomWithLatest } from "@/types";

type Step     = "form" | "success";
type OcrState = "idle" | "reading" | "confirm" | "error";

const FRAME_W_RATIO = 0.85;
const FRAME_H_RATIO = 0.38;

const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// ─── Hook: persist เดือน/ปี ───────────────────────────────────────────────────
function usePersistentMonthYear() {
  const now = new Date();
  const [month,  setMonthState] = useState<number>(now.getMonth() + 1);
  const [year,   setYearState]  = useState<number>(now.getFullYear());
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scan-month-year");
      if (saved) {
        const { month: m, year: y } = JSON.parse(saved) as { month: number; year: number };
        if (m >= 1 && m <= 12) setMonthState(m);
        if (y > 2000)           setYearState(y);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const setMonth = useCallback((m: number) => {
    setMonthState(m);
    localStorage.setItem("scan-month-year", JSON.stringify({ month: m, year }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const setYear = useCallback((y: number) => {
    setYearState(y);
    localStorage.setItem("scan-month-year", JSON.stringify({ month, year: y }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return { month, year, setMonth, setYear, loaded };
}

// ─── crop รูปตาม transform ────────────────────────────────────────────────────
function cropImageWithTransform(
  original: string,
  containerW: number,
  containerH: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const displayW  = containerW * scale;
      const displayH  = containerH * scale;
      const imgLeft   = (containerW - displayW) / 2 + offsetX;
      const imgTop    = (containerH - displayH) / 2 + offsetY;
      const frameW    = containerW * FRAME_W_RATIO;
      const frameH    = containerH * FRAME_H_RATIO;
      const frameLeft = (containerW - frameW) / 2;
      const frameTop  = (containerH - frameH) / 2;

      const scaleToNatural = img.naturalWidth / displayW;
      const cropX = (frameLeft - imgLeft) * scaleToNatural;
      const cropY = (frameTop  - imgTop)  * scaleToNatural;
      const cropW = frameW * scaleToNatural;
      const cropH = frameH * scaleToNatural;

      const canvas = document.createElement("canvas");
      canvas.width  = Math.max(1, cropW);
      canvas.height = Math.max(1, cropH);
      canvas.getContext("2d")!.drawImage(
        img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = original;
  });
}

// ─── ViewfinderFrame ──────────────────────────────────────────────────────────
function ViewfinderFrame({ wRatio, hRatio }: { wRatio: number; hRatio: number }) {
  const left = `${(1 - wRatio) / 2 * 100}%`;
  const top  = `${(1 - hRatio) / 2 * 100}%`;
  const w    = `${wRatio * 100}%`;
  const h    = `${hRatio * 100}%`;
  const c    = "w-5 h-5 border-primary";
  return (
    <div className="absolute" style={{ left, top, width: w, height: h }}>
      <div className="absolute inset-0 border border-white/20 rounded-sm" />
      <div className={`absolute top-0 left-0 border-t-2 border-l-2 rounded-tl-sm ${c}`} />
      <div className={`absolute top-0 right-0 border-t-2 border-r-2 rounded-tr-sm ${c}`} />
      <div className={`absolute bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm ${c}`} />
      <div className={`absolute bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm ${c}`} />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/20" />
    </div>
  );
}

// ─── ViewfinderOverlay ────────────────────────────────────────────────────────
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

// ─── Camera Modal ─────────────────────────────────────────────────────────────
interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready,            setReady]            = useState(false);
  const [permissionError,  setPermissionError]  = useState("");
  const [useInputFallback, setUseInputFallback] = useState(false);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (!supported) { setUseInputFallback(true); return; }

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
          setPermissionError(
            "ไม่ได้รับอนุญาตให้ใช้กล้อง\n\n" +
            "หากใช้ Chrome บน iPhone กรุณาเปิดด้วย Safari\n" +
            "หรือกดปุ่ม 'เลือกรูปจากคลัง' แทน"
          );
        } else {
          setUseInputFallback(true);
        }
      }
    }
    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (useInputFallback) {
      const t = setTimeout(() => fileInputRef.current?.click(), 150);
      return () => clearTimeout(t);
    }
  }, [useInputFallback]);

  const handleCapture = useCallback(() => {
    const video     = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !ready) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const videoAspect     = video.videoWidth / video.videoHeight;
    const containerAspect = cW / cH;

    let displayW: number, displayH: number, offsetX: number, offsetY: number;
    if (videoAspect > containerAspect) {
      displayH = cH; displayW = cH * videoAspect;
      offsetX  = (cW - displayW) / 2; offsetY = 0;
    } else {
      displayW = cW; displayH = cW / videoAspect;
      offsetX  = 0;  offsetY  = (cH - displayH) / 2;
    }

    const frameW    = cW * FRAME_W_RATIO;
    const frameH    = cH * FRAME_H_RATIO;
    const frameLeft = (cW - frameW) / 2;
    const frameTop  = (cH - frameH) / 2;

    const scaleX = video.videoWidth  / displayW;
    const scaleY = video.videoHeight / displayH;
    const cropX  = (frameLeft - offsetX) * scaleX;
    const cropY  = (frameTop  - offsetY) * scaleY;
    const cropW  = frameW * scaleX;
    const cropH  = frameH * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width  = Math.max(1, cropW);
    canvas.height = Math.max(1, cropH);
    canvas.getContext("2d")!.drawImage(
      video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height,
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(new File([blob], `meter-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [ready, onCapture]);

  const handleClose = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }, [onClose]);

  const handleFallbackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file); else onClose();
  }, [onCapture, onClose]);

  // ─── Fallback UI ──────────────────────────────────────────────────────────
  if (useInputFallback) {
    return (
      <>
        <input
          ref={fileInputRef} type="file" accept="image/*"
          capture="environment" className="hidden"
          onChange={handleFallbackChange}
        />
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}>
          <div className="bg-background rounded-2xl p-6 w-full max-w-xs text-center space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">ถ่ายรูปมิเตอร์</p>
              <p className="text-xs text-muted-foreground mt-1">
                วางมิเตอร์ให้อยู่ในกรอบก่อนถ่าย
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button size="sm" className="flex-1 gap-1.5"
                onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-3.5 h-3.5" /> เปิดกล้อง
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── getUserMedia UI ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        <p className="text-white text-sm font-medium">วางมิเตอร์ในกรอบแล้วถ่าย</p>
        <div className="w-10" />
      </div>

      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {permissionError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Camera className="w-12 h-12 text-white/40" />
            <p className="text-white/80 text-sm whitespace-pre-line">{permissionError}</p>
            <Button variant="outline" size="sm" onClick={handleClose}
              className="border-white/30 text-white hover:bg-white/10">
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover" />
            {ready && <ViewfinderOverlay />}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            {ready && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  วางตัวเลขมิเตอร์ให้อยู่ในกรอบ แล้วกดถ่าย
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {!permissionError && (
        <div className="flex items-center justify-center py-8 bg-black">
          <button onClick={handleCapture} disabled={!ready}
            className="rounded-full border-4 border-white flex items-center justify-center
                       disabled:opacity-40 active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}>
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
    <div className="fixed inset-x-0 bottom-16 z-40 flex items-end justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-3xl p-5 space-y-4
                      shadow-[0_-4px_24px_rgba(0,0,0,0.12)]
                      animate-in slide-in-from-bottom duration-300">
        <div className="rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={croppedImage} alt="cropped meter" className="w-full h-32 object-cover" />
        </div>

        {ocrState === "reading" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">กำลังอ่านค่ามิเตอร์...</p>
          </div>
        )}

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

        {ocrState === "confirm" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-0.5">ค่ามิเตอร์ที่อ่านได้</p>
              <p className="text-xs text-muted-foreground mb-2">
                ตรวจสอบและแก้ไขได้ก่อนยืนยัน
              </p>
              <div className="relative">
                <Input
                  type="number" inputMode="decimal" value={editValue}
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

  const [scale,  setScale]  = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistRef  = useRef<number | null>(null);
  const scaleRef     = useRef(1);
  const offsetRef    = useRef({ x: 0, y: 0 });

  useEffect(() => { scaleRef.current  = scale;  }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, [imagePreview]);

  const getDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastDistRef.current  = null;
    } else if (e.touches.length === 2) {
      lastDistRef.current  = getDist(e.touches);
      lastTouchRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (e.touches.length === 2 && lastDistRef.current !== null) {
      const dist  = getDist(e.touches);
      const delta = dist / lastDistRef.current;
      lastDistRef.current = dist;
      setScale((prev) => Math.min(Math.max(prev * delta, 1), 5));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    lastDistRef.current  = null;
  }, []);

  const handleConfirmCrop = useCallback(async () => {
    if (!imagePreview || !containerRef.current) return;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const cropped = await cropImageWithTransform(
      imagePreview, cW, cH,
      scaleRef.current, offsetRef.current.x, offsetRef.current.y,
    );
    onImageReady(cropped, imagePreview);
  }, [imagePreview, onImageReady]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const original = evt.target?.result as string;
      onImageReady("__pending__", original);
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
    const reader = new FileReader();
    reader.onload = (evt) => {
      const cropped = evt.target?.result as string;
      onImageReady(cropped, cropped);
    };
    reader.readAsDataURL(file);
  }, [onImageReady]);

  const vPad      = `${(1 - FRAME_H_RATIO) / 2 * 100}%`;
  const hPad      = `${(1 - FRAME_W_RATIO) / 2 * 100}%`;
  const showImage = imagePreview && imagePreview !== "__pending__";

  return (
    <>
      <div className="space-y-2">
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden bg-gray-900 select-none"
          style={{ height: 220 }}
          onTouchStart={showImage ? handleTouchStart : undefined}
          onTouchMove={showImage ? handleTouchMove : undefined}
          onTouchEnd={showImage ? handleTouchEnd : undefined}
        >
          {showImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview} alt="meter" draggable={false}
                style={{
                  position: "absolute", width: "100%", height: "100%",
                  objectFit: "cover",
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: "center center",
                  transition: "none", userSelect: "none", touchAction: "none",
                }}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: vPad }} />
                <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, left: 0, width: hPad }} />
                <div className="absolute bg-black/50" style={{ top: vPad, bottom: vPad, right: 0, width: hPad }} />
                <ViewfinderFrame wRatio={FRAME_W_RATIO} hRatio={FRAME_H_RATIO} />
              </div>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  ลากเลื่อน / Pinch ย่อขยาย → กด ✓
                </span>
              </div>
              <button onClick={onRemove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60
                           flex items-center justify-center z-10">
                <X className="w-4 h-4 text-white" />
              </button>
              <button onClick={handleConfirmCrop}
                className="absolute top-2 left-2 w-8 h-8 rounded-full bg-primary
                           flex items-center justify-center z-10">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </button>
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
          ref={fileInputRef} type="file" accept="image/*"
          className="hidden" onChange={handleChange}
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

// ─── StepBadge ────────────────────────────────────────────────────────────────
function StepBadge({ n, secondary }: { n: number; secondary?: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
      secondary
        ? "bg-secondary text-secondary-foreground"
        : "bg-primary text-primary-foreground"
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
          ห้อง {record.room?.name ?? record.roomId} ·{" "}
          {new Date(record.recordedAt).toLocaleTimeString("th-TH", {
            hour: "2-digit", minute: "2-digit",
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {MONTHS_TH[record.month - 1]} {record.year + 543}
        </p>
      </div>
      <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-3 text-left shadow-sm">
        <SummaryRow label="ห้อง" value={record.room?.name ?? record.roomId} />
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

// ─── ScanForm ─────────────────────────────────────────────────────────────────
function ScanForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { month, year, setMonth, setYear, loaded } = usePersistentMonthYear();

  const [rooms,          setRooms]          = useState<RoomWithLatest[]>([]);
  const [step,           setStep]           = useState<Step>("form");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [meterValue,     setMeterValue]     = useState("");
  const [note,           setNote]           = useState("");
  const [imageOriginal,  setImageOriginal]  = useState<string | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [error,          setError]          = useState("");
  const [savedRecord,    setSavedRecord]    = useState<MeterRecord | null>(null);
  const [submitting,     setSubmitting]     = useState(false);

  const [ocrState,     setOcrState]     = useState<OcrState>("idle");
  const [ocrValue,     setOcrValue]     = useState<number | null>(null);
  const [ocrError,     setOcrError]     = useState("");
  const [showOcrModal, setShowOcrModal] = useState(false);

  const now     = new Date();
  const curYear = now.getFullYear();
  const years   = Array.from({ length: 21 }, (_, i) => curYear - 10 + i);

  useEffect(() => {
    getRooms().then(setRooms).catch(() => {});
  }, []);

  useEffect(() => {
    const p = searchParams.get("room");
    if (p) setSelectedRoomId(p);
  }, [searchParams]);

  const runOcr = useCallback(async (imageBase64: string) => {
    setOcrState("reading"); setOcrError(""); setShowOcrModal(true);
    try {
      const res  = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json() as { value?: number; error?: string };
      if (data.value != null) {
        setOcrValue(data.value); setOcrState("confirm");
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
    if (cropped === "__pending__") {
      setImageOriginal(original); setCroppedDataUrl(null); return;
    }
    setImageOriginal(original); setCroppedDataUrl(cropped); runOcr(cropped);
  }, [runOcr]);

  const handleRemoveImage = useCallback(() => {
    setImageOriginal(null); setCroppedDataUrl(null);
    setOcrState("idle"); setOcrValue(null); setShowOcrModal(false);
  }, []);

  const handleOcrConfirm = useCallback((v: number) => {
    setMeterValue(v.toString()); setShowOcrModal(false); setOcrState("idle");
  }, []);

  const handleRetake = useCallback(() => {
    setImageOriginal(null); setCroppedDataUrl(null);
    setOcrState("idle"); setOcrValue(null); setShowOcrModal(false);
  }, []);

  const handleRetryOcr = useCallback(() => {
    if (croppedDataUrl) runOcr(croppedDataUrl);
  }, [croppedDataUrl, runOcr]);

  const handleSubmit = useCallback(async () => {
    setError("");
    if (!month)          { setError("กรุณาเลือกเดือน");               return; }
    if (!selectedRoomId) { setError("กรุณาเลือกห้อง");                return; }
    const numValue = parseFloat(meterValue);
    if (!meterValue || isNaN(numValue) || numValue < 0) {
      setError("กรุณากรอกเลขมิเตอร์ให้ถูกต้อง"); return;
    }
    setSubmitting(true);
    try {
      const record = await saveRecord({
        roomId:   selectedRoomId,
        type:     "ELECTRIC",
        value:    numValue,
        imageUrl: croppedDataUrl,
        note:     note.trim(),
        month,
        year,
      });
      setSavedRecord(record);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }, [month, year, selectedRoomId, meterValue, note, croppedDataUrl]);

  const handleReset = useCallback(() => {
    setStep("form"); setSelectedRoomId(""); setMeterValue(""); setNote("");
    setImageOriginal(null); setCroppedDataUrl(null);
    setOcrState("idle"); setOcrValue(null); setError(""); setSavedRecord(null);
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (step === "success" && savedRecord) {
    return (
      <SuccessScreen
        record={savedRecord}
        onReset={handleReset}
        onHome={() => router.push("/")}
      />
    );
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const latestElec   = selectedRoom?.records.find((r) => r.type === "ELECTRIC") ?? null;
  const currentNum   = parseFloat(meterValue);
  const buildings    = Array.from(new Set(rooms.map((r) => r.building))).sort();
  const floors       = Array.from(new Set(rooms.map((r) => r.floor))).sort();

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

          {/* Step 1: เดือน/ปี */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={1} />
              เดือน / ปี ที่บันทึก
              <span className="text-destructive text-xs">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full h-12 rounded-xl border-2 border-input bg-background
                             px-3 text-sm appearance-none pr-8
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTHS_TH.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative w-28">
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full h-12 rounded-xl border-2 border-input bg-background
                             px-3 text-sm appearance-none pr-8
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y + 543}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              บันทึกสำหรับ {MONTHS_TH[month - 1]} {year + 543} — ค่าจะถูกจดจำไว้
            </p>
          </div>

          {/* Step 2: ห้อง */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={2} />
              เลือกห้อง
              <span className="text-destructive text-xs">*</span>
            </Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className={!selectedRoomId ? "text-muted-foreground" : ""}>
                <SelectValue placeholder="เลือกห้องที่ต้องการบันทึก..." />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((building) =>
                  floors.map((floor) => {
                    const roomsInGroup = rooms.filter(
                      (r) => r.building === building && r.floor === floor
                    );
                    if (roomsInGroup.length === 0) return null;
                    return (
                      <SelectGroup key={`${building}-${floor}`}>
                        <SelectLabel>อาคาร {building} ชั้น {floor}</SelectLabel>
                        {roomsInGroup.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            ห้อง {room.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {latestElec && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                ค่ามิเตอร์ไฟล่าสุด:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {latestElec.value.toLocaleString()}
                </span>{" "}หน่วย
              </p>
            )}
          </div>

          {/* Step 3: รูป */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={3} />
              ถ่ายรูปมิเตอร์{" "}
              <span className="text-muted-foreground font-normal text-xs">(ไม่บังคับ)</span>
            </Label>
            <ViewfinderPicker
              imagePreview={imageOriginal}
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

          {/* Step 4: เลขมิเตอร์ */}
          <div className="space-y-2">
            <Label htmlFor="meter-value" className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={4} />
              เลขมิเตอร์
              <span className="text-destructive text-xs">*</span>
            </Label>
            <Input
              id="meter-value" type="number" inputMode="decimal"
              placeholder="เช่น 1234.5" value={meterValue}
              onChange={(e) => setMeterValue(e.target.value)}
              className="text-xl font-mono font-semibold text-center h-14"
            />
            {latestElec && meterValue && !isNaN(currentNum) && (
              <p className="text-xs text-center">
                {currentNum > latestElec.value ? (
                  <span className="text-emerald-600 font-medium">
                    ใช้ไป {(currentNum - latestElec.value).toFixed(1)} หน่วย
                  </span>
                ) : currentNum === latestElec.value ? (
                  <span className="text-muted-foreground">ค่าเท่าเดิม</span>
                ) : (
                  <span className="text-amber-600">
                    ค่าน้อยกว่าครั้งก่อน — กรุณาตรวจสอบ
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Step 5: หมายเหตุ */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-semibold flex items-center gap-1.5">
              <StepBadge n={5} secondary />
              หมายเหตุ{" "}
              <span className="text-muted-foreground font-normal text-xs">(ไม่บังคับ)</span>
            </Label>
            <Input
              id="note" type="text"
              placeholder="เช่น มิเตอร์ชำรุด, บันทึกล่าช้า..."
              value={note} onChange={(e) => setNote(e.target.value)}
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
              size="xl" className="w-full gap-2 shadow-lg shadow-primary/25"
              onClick={handleSubmit} disabled={submitting}
            >
              {submitting
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 className="w-5 h-5" />}
              {submitting ? "กำลังบันทึก..." : "ยืนยันบันทึก"}
            </Button>
          </div>
        </div>
      </div>

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

// ─── Page export ──────────────────────────────────────────────────────────────
export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    }>
      <ScanForm />
    </Suspense>
  );
}