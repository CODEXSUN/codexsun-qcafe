import { fileURLToPath } from "node:url";
import { WorkspaceToolProvider } from "./workspace-tools.mjs";
import { createRunnerHttp } from "./http.mjs";

const root = process.env.ZETRO_WORKSPACE_ROOT || fileURLToPath(new URL("../template", import.meta.url));
const workspace = await WorkspaceToolProvider.create(root);
const server = createRunnerHttp({ workspace, token: process.env.ZETRO_TOOLS_TOKEN, audit: (event) => console.log(JSON.stringify({ service: "zetro-local-runner", ...event })) });
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(4160, "127.0.0.1", () => console.log("Zetro local read-only tools ready on 127.0.0.1:4160"));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
