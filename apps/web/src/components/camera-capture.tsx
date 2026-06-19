"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * In-app camera (getUserMedia). Captures a still into a sibling
 * `<input type="file" name={targetInputName}>` so existing upload forms work
 * unchanged. Falls back gracefully (the file input remains) if camera is denied.
 */
export function CameraCapture({
  targetInputName,
  label = "카메라로 촬영",
}: {
  targetInputName: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
  }

  async function start(mode: "user" | "environment" = facing) {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setError("카메라를 열 수 없어요. 권한을 확인하거나 파일 선택을 이용하세요.");
    }
  }

  useEffect(() => () => stop(), []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const input = document.querySelector<HTMLInputElement>(
          `input[type=file][name="${targetInputName}"]`,
        );
        if (input) {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        setPreview(URL.createObjectURL(blob));
        stop();
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!open && (
        <Button type="button" variant="outline" size="sm" onClick={() => start()}>
          {label}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {open && (
        <div className="rounded-md border p-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[3/4] w-full rounded bg-black object-cover"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={capture}>
              촬영
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = facing === "user" ? "environment" : "user";
                setFacing(next);
                stop();
                void start(next);
              }}
            >
              전/후면 전환
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={stop}>
              닫기
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="촬영한 사진"
            className="size-16 rounded border bg-background object-cover"
          />
          <span className="text-xs text-muted-foreground">촬영 완료 — 그대로 올리거나 다시 찍으세요.</span>
        </div>
      )}
    </div>
  );
}
