import { latLngToGrid } from "../lib/kma-grid";
import { createTtlCache } from "../lib/resilience";

// A KMA forecast for a grid cell is identical until the next publish (~3h), so
// cache it ~30min. Module-level → shared across warm serverless invocations.
const forecastCache = createTtlCache<Forecast>({
  ttlMs: 30 * 60 * 1000,
  max: 500,
});

export interface Forecast {
  tempMax: number;
  tempMin: number;
  pop: number; // precipitation probability %
  pty: number; // precip type (0 none)
  sky: number; // 1 clear, 3 cloudy, 4 overcast
  nx: number;
  ny: number;
  source: "kma" | "fallback";
}

export interface WeatherService {
  isReal: boolean;
  forecast(lat: number, lng: number): Promise<Forecast>;
}

/** Latest KMA 단기예보 base_date/base_time (forecasts publish ~10min after). */
function kmaBase(now: Date): { baseDate: string; baseTime: string } {
  const times = [2, 5, 8, 11, 14, 17, 20, 23];
  const d = new Date(now.getTime() - 10 * 60 * 1000); // 10-min safety margin
  let hour = d.getHours();
  let base = [...times].reverse().find((t) => hour >= t);
  const day = new Date(d);
  if (base === undefined) {
    base = 23;
    day.setDate(day.getDate() - 1);
  }
  const yyyy = day.getFullYear();
  const mm = String(day.getMonth() + 1).padStart(2, "0");
  const dd = String(day.getDate()).padStart(2, "0");
  return { baseDate: `${yyyy}${mm}${dd}`, baseTime: `${String(base).padStart(2, "0")}00` };
}

export function getWeatherService(now: () => Date = () => new Date()): WeatherService {
  const key = process.env.KMA_SERVICE_KEY;

  if (!key) {
    return {
      isReal: false,
      forecast: async (lat, lng) => {
        const { nx, ny } = latLngToGrid(lat, lng);
        return {
          tempMax: 18,
          tempMin: 9,
          pop: 20,
          pty: 0,
          sky: 1,
          nx,
          ny,
          source: "fallback",
        };
      },
    };
  }

  return {
    isReal: true,
    async forecast(lat, lng) {
      const { nx, ny } = latLngToGrid(lat, lng);
      const { baseDate, baseTime } = kmaBase(now());
      return forecastCache.getOrSet(
        `${nx}:${ny}:${baseDate}:${baseTime}`,
        () => fetchForecast(key, nx, ny, baseDate, baseTime),
      );
    },
  };
}

/** One KMA 단기예보 fetch+parse (cached by the caller). */
async function fetchForecast(
  key: string,
  nx: number,
  ny: number,
  baseDate: string,
  baseTime: string,
): Promise<Forecast> {
  const base =
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
      const params = new URLSearchParams({
        dataType: "JSON",
        numOfRows: "1000",
        pageNo: "1",
        base_date: baseDate,
        base_time: baseTime,
        nx: String(nx),
        ny: String(ny),
      });
      // KMA expects the (decoded) service key appended raw — avoid double-encoding.
      const res = await fetch(`${base}?serviceKey=${key}&${params.toString()}`);
      if (!res.ok) throw new Error(`KMA forecast failed: ${res.status}`);
      const json = (await res.json()) as {
        response?: { body?: { items?: { item?: Array<Record<string, string>> } } };
      };
      const items = json.response?.body?.items?.item ?? [];

      let tempMax = Number.NEGATIVE_INFINITY;
      let tempMin = Number.POSITIVE_INFINITY;
      let tmp = Number.NaN;
      let pop = 0;
      let pty = 0;
      let sky = 1;
      for (const it of items) {
        const v = Number(it.fcstValue);
        switch (it.category) {
          case "TMX": tempMax = Math.max(tempMax, v); break;
          case "TMN": tempMin = Math.min(tempMin, v); break;
          case "TMP": tmp = Number.isNaN(tmp) ? v : tmp; break;
          case "POP": pop = Math.max(pop, v); break;
          case "PTY": pty = Math.max(pty, v); break;
          case "SKY": sky = v; break;
        }
      }
      // Late in the day TMX/TMN may be absent → fall back to current temp.
      if (!Number.isFinite(tempMax)) tempMax = Number.isNaN(tmp) ? 18 : tmp;
      if (!Number.isFinite(tempMin))
        tempMin = Number.isNaN(tmp) ? tempMax - 6 : tmp - 6;

      return { tempMax, tempMin, pop, pty, sky, nx, ny, source: "kma" };
}
