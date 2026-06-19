"use client";

import { useState } from "react";
import { updateGarmentAction } from "@/server/actions/garments";
import { Button } from "@/components/ui/button";

type Cat = {
  id: number;
  slug: string;
  nameKo: string;
  subs: { id: number; slug: string; nameKo: string }[];
};

const inputClass =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SEASONS = [
  ["spring", "봄"],
  ["summer", "여름"],
  ["fall", "가을"],
  ["winter", "겨울"],
] as const;

const STATUSES = [
  ["active", "사용중"],
  ["wishlist", "위시리스트"],
  ["archived", "보관"],
  ["donated", "기부·판매"],
] as const;

export function EditGarmentForm({
  garment,
  taxonomy = [],
}: {
  garment: {
    id: number;
    name: string | null;
    categoryId: number | null;
    subcategoryId: number | null;
    season: string[] | null;
    status: string;
  };
  taxonomy?: Cat[];
}) {
  const [catId, setCatId] = useState(
    garment.categoryId ? String(garment.categoryId) : "",
  );
  const subs = taxonomy.find((c) => String(c.id) === catId)?.subs ?? [];
  const season = garment.season ?? [];

  return (
    <form action={updateGarmentAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="id" value={garment.id} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">이름</span>
        <input
          name="name"
          defaultValue={garment.name ?? ""}
          className={inputClass}
        />
      </label>

      {taxonomy.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <select
            name="categoryId"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className={inputClass}
          >
            <option value="">카테고리</option>
            {taxonomy.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameKo}
              </option>
            ))}
          </select>
          <select
            key={catId}
            name="subcategoryId"
            defaultValue={garment.subcategoryId ?? ""}
            className={inputClass}
            disabled={subs.length === 0}
          >
            <option value="">세부 분류</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameKo}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {SEASONS.map(([val, label]) => (
          <label key={val} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="season"
              value={val}
              defaultChecked={season.includes(val)}
              className="size-4 accent-primary"
            />
            {label}
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">상태</span>
        <select
          name="status"
          defaultValue={garment.status}
          className={inputClass}
        >
          {STATUSES.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" variant="outline" size="sm">
        정보 저장
      </Button>
    </form>
  );
}
