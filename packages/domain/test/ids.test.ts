import { describe, expect, it } from "vitest";
import { uuidV7 } from "../src";

describe("uuidV7", () => {
  it("tiene el formato de un UUID versión 7", () => {
    expect(uuidV7()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("lleva la hora al principio: los creados después se ordenan después", () => {
    const a = uuidV7(1_760_000_000_000);
    const b = uuidV7(1_760_000_000_001);
    expect(a < b).toBe(true);
    expect(a.replace(/-/g, "").slice(0, 12)).toBe((1_760_000_000_000).toString(16).padStart(12, "0"));
  });

  it("dos creados en el mismo milisegundo no chocan", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidV7(1_760_000_000_000)));
    expect(ids.size).toBe(1000);
  });
});
