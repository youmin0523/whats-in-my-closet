import { describe, expect, it } from "vitest";
import { createCaller } from "../root";
import { createTRPCContext } from "../trpc";

async function caller() {
  const ctx = await createTRPCContext({
    headers: new Headers(),
    session: null,
  });
  return createCaller(ctx);
}

describe("health router", () => {
  it("ping returns ok with the service name", async () => {
    const api = await caller();
    const res = await api.health.ping();
    expect(res.ok).toBe(true);
    expect(res.service).toBe("closet-api");
    expect(typeof res.time).toBe("string");
  });

  it("echo returns the input message", async () => {
    const api = await caller();
    const res = await api.health.echo({ message: "안녕, 옷장" });
    expect(res.echo).toBe("안녕, 옷장");
  });

  it("echo rejects an empty message", async () => {
    const api = await caller();
    await expect(api.health.echo({ message: "" })).rejects.toThrow();
  });
});
