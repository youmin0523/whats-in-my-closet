"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Geolocation consent → location-based weather (부산≠파주). */
export function UseMyLocation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            router.replace(
              `/today?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
            ),
          () => setLoading(false),
          { enableHighAccuracy: false, timeout: 8000 },
        );
      }}
    >
      {loading ? "위치 확인 중…" : "내 위치 사용"}
    </Button>
  );
}
