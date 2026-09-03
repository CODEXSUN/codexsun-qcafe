import assert from "node:assert/strict";
import test from "node:test";
import { createViteDevelopmentServer } from "./vite-development.mjs";

const options = { host: "127.0.0.1", port: 5173 };

test("disables Vite hot reload by default", () => {
  const server = createViteDevelopmentServer(options, {});
  assert.equal(server.hmr, false);
  assert.equal(server.watch.usePolling, false);
  assert.deepEqual(server.watch.awaitWriteFinish, { pollInterval: 75, stabilityThreshold: 350 });
  assert.deepEqual(server.watch.ignored, ["**/dist/**"]);
});

test("supports polling and remote hot reload clients", () => {
  const server = createViteDevelopmentServer(options, {
    CODEXSUN_VITE_HMR_HOST: "design.codexsun.test",
    CODEXSUN_VITE_HMR_POLLING: "true",
    CODEXSUN_VITE_HMR_PORT: "443",
    CODEXSUN_VITE_HMR_PROTOCOL: "wss",
    CODEXSUN_VITE_HOT_RELOAD: "true",
  });
  assert.deepEqual(server.hmr, { clientPort: 443, host: "design.codexsun.test", protocol: "wss" });
  assert.equal(server.watch.interval, 150);
  assert.equal(server.watch.usePolling, true);
});

test("can enable hot reload explicitly", () => {
  const server = createViteDevelopmentServer(options, { CODEXSUN_VITE_HOT_RELOAD: "true" });
  assert.equal(server.hmr, true);
});
