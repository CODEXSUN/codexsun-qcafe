import { describe, expect, it } from "vitest";
import type { TenantContextResolver } from "./index.js";

describe("platform host contracts", () => {
  it("permits tenant resolution only from trusted host input", async () => {
    const resolver: TenantContextResolver = { async resolve(input) { return input.hostname === "tenant.example" ? { databaseId: "tenant_db", tenantId: "10c6b035-0030-48ea-bbf6-b175b5ed77a4" } : undefined; } };
    expect(await resolver.resolve({ actor: { applicationIds: ["app.devkit"], id: "34e2f1d2-ffeb-48a4-b69d-7522f29678a8", permissions: [], sessionId: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91" }, applicationId: "app.devkit", hostname: "tenant.example" })).toMatchObject({ tenantId: "10c6b035-0030-48ea-bbf6-b175b5ed77a4" });
  });
});
