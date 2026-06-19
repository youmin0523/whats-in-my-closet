export interface TryOnRequest {
  modelImageUrl: string;
  garmentImageUrl: string;
  category?: string;
}
export interface TryOnResponse {
  jobId: string;
  status: "queued" | "processing" | "done" | "failed";
  resultUrl?: string;
}

export interface FashnService {
  isReal: boolean;
  run(req: TryOnRequest): Promise<TryOnResponse>;
}

export function getFashnService(): FashnService {
  const key = process.env.FASHN_API_KEY;

  if (!key) {
    // Dev fallback: echo the base photo so the try-on flow is exercisable
    // (no real garment compositing without a key).
    return {
      isReal: false,
      run: async (req) => ({
        jobId: `dev-${req.garmentImageUrl.length}`,
        status: "done",
        resultUrl: req.modelImageUrl,
      }),
    };
  }

  return {
    isReal: true,
    async run(req) {
      const res = await fetch("https://api.fashn.ai/v1/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_name: "tryon-v1.6",
          inputs: {
            model_image: req.modelImageUrl,
            garment_image: req.garmentImageUrl,
            category: req.category ?? "auto",
          },
        }),
      });
      if (!res.ok) throw new Error(`FASHN run failed: ${res.status}`);
      const json = (await res.json()) as { id: string; status?: string };
      return {
        jobId: json.id,
        status: (json.status as TryOnResponse["status"]) ?? "processing",
      };
    },
  };
}
