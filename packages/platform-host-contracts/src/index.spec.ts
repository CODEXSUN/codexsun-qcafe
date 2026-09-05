import { describe, expect, it } from "vitest";
import type { TenantContextResolver } from "./index.js";

describe("platform host contracts", () => {
  it("permits tenant resolution only from trusted host input", async () => {
    const resolver: TenantContextResolver = { async resolve(input) { return input.hostname === "tenant.example" ? { databaseId: "tenant_db", tenantId: "10c6b035-0030-48ea-bbf6-b175b5ed77a4" } : undefined; } };
    expect(await resolver.resolve({ actor: { applicationIds: ["app.devkit"], id: "34e2f1d2-ffeb-48a4-b69d-7522f29678a8", permissions: [], sessionId: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91" }, applicationId: "app.devkit", hostname: "tenant.example" })).toMatchObject({ tenantId: "10c6b035-0030-48ea-bbf6-b175b5ed77a4" });
  });

  it("validates application summary and detail DTO structures", () => {
    const summary = {
      apiUrl: "http://127.0.0.1:5174/api",
      areasCount: 2,
      description: "Developer tools and workspace.",
      entitlementState: "entitled" as const,
      hasPublicManagementContract: false,
      id: "app.devkit",
      modulesCount: 4,
      name: "DevKit",
      owner: "DevKit",
      runtimeStatus: "running" as const,
      state: "active" as const,
      version: "0.1.1",
      webUrl: "http://127.0.0.1:5174",
    };
    expect(summary.id).toBe("app.devkit");
    expect(summary.entitlementState).toBe("entitled");
  });
});
