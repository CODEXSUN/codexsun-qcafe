import { describe, expect, it } from "vitest";
import { createToken, ServiceContainer } from "./service-container.js";

describe("ServiceContainer", () => {
  it("creates a bound service once", () => {
    const token = createToken<{ value: number }>("counter");
    const container = new ServiceContainer();
    let calls = 0;
    container.bind(token, () => ({ value: ++calls }));

    expect(container.resolve(token)).toBe(container.resolve(token));
    expect(calls).toBe(1);
  });

  it("rejects circular service factories", () => {
    const first = createToken<string>("first");
    const second = createToken<string>("second");
    const container = new ServiceContainer();
    container.bind(first, (services) => services.resolve(second));
    container.bind(second, (services) => services.resolve(first));

    expect(() => container.resolve(first)).toThrow("Circular dependency");
  });
});
