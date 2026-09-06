#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "node:child_process";

const ZXA_URL = (process.env.ZXA_URL || "http://127.0.0.1:4230").replace(/\/+$/, "");
const ZXA_TOKEN = process.env.ZXA_TOKEN || process.env.ZXA_LOCAL_TOKEN || "local-zxa-only";

const PROVIDER_MAP = {
  g: "g",
  gemini: "g",
  google: "g",
  c: "c",
  codex: "c",
  openai: "c",
  o: "o",
  opencode: "o",
};

function openBrowser(targetUrl) {
  const url = targetUrl || `${ZXA_URL}/`;
  const cmd = process.platform === "win32"
    ? `start "" "${url}"`
    : process.platform === "darwin"
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error(`⚠️ Could not automatically open browser: ${err.message}`);
  });
  console.log(`\n🌐 Opened ZXA connection manager in browser: ${url}\n`);
}

async function zxaRequest(path, options = {}) {
  const url = `${ZXA_URL}${path}`;
  const headers = {
    "Authorization": `Bearer ${ZXA_TOKEN}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      method: options.method || (options.body ? "POST" : "GET"),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      throw new Error(`Cannot reach ZXA at ${ZXA_URL}. Ensure the ZXA Docker container is running (npm run zxa:setup or docker compose up).`);
    }
    throw err;
  }
}

function parseFlags(args) {
  const positional = [];
  const flags = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function formatDuration(ms) {
  if (ms == null) return "-";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatTokens(usage) {
  if (!usage) return "N/A";
  const inTokens = usage.inputTokens ?? usage.input_tokens ?? 0;
  const outTokens = usage.outputTokens ?? usage.output_tokens ?? 0;
  return `${inTokens} in / ${outTokens} out (total: ${inTokens + outTokens})`;
}

async function showStatus() {
  console.log(`\n🔍 Checking ZXA runtime at ${ZXA_URL}...\n`);
  const health = await zxaRequest("/health");
  const connections = await zxaRequest("/api/v1/zxa/connections");
  const usage = await zxaRequest("/api/v1/zxa/usage");

  console.log(`✨ ZXA Runtime Status: [${health.status.toUpperCase()}]`);
  console.log(`   Agent ID: ${health.agentId}`);
  console.log(`   Any Configured: ${health.configured ? "Yes" : "No"}`);
  console.log(`   Web UI: ${ZXA_URL}/`);
  console.log("");

  console.log("┌─────────┬──────────────┬───────────────┬──────────────────────┬───────────────────────────────┐");
  console.log("│ ID      │ Name         │ Status        │ Model                │ Requests / Usage              │");
  console.log("├─────────┼──────────────┼───────────────┼──────────────────────┼───────────────────────────────┤");

  for (const p of connections.providers) {
    const metric = usage.providers?.[p.id];
    const statusText = p.configured ? "🟢 Connected" : "⚪ Not Configured";
    const requestsText = metric ? `${metric.completed}/${metric.requests} ok (${formatDuration(metric.lastDurationMs)})` : "0 requests";
    console.log(
      `│ ${p.id.padEnd(7)} │ ${p.name.padEnd(12)} │ ${statusText.padEnd(13)} │ ${(p.model || "").padEnd(20)} │ ${requestsText.padEnd(29)} │`
    );
  }
  console.log("└─────────┴──────────────┴───────────────┴──────────────────────┴───────────────────────────────┘");

  if (connections.codex?.status && connections.codex.status !== "idle") {
    console.log(`\nCodex device auth status: ${connections.codex.status}`);
    if (connections.codex.code) console.log(`Device code: ${connections.codex.code}`);
    if (connections.codex.url) console.log(`Device URL: ${connections.codex.url}`);
  }
  console.log("");
}

async function showModels(args, flags) {
  const providerInput = args[0] || "gemini";
  const id = PROVIDER_MAP[providerInput.toLowerCase()] || "g";
  const name = id === "g" ? "Gemini" : id === "c" ? "Codex" : "OpenCode";

  console.log(`\n🤖 Fetching available models for ${name}...`);
  const apiKeyQuery = flags.apiKey ? `?apiKey=${encodeURIComponent(flags.apiKey)}` : "";
  const res = await zxaRequest(`/api/v1/zxa/connections/${id}/models${apiKeyQuery}`);

  const sourceLabel = res.live
    ? (id === "g" ? "🟢 Live from Google API" : id === "o" ? "🟢 Live from OpenCode CLI" : "Live")
    : "Standard Catalog";
  console.log(`✨ ${name} Models (${sourceLabel}):\n`);
  console.log("┌──────────────────────────────────────┬──────────────────────────┬──────────────────────────────────────────────────────┐");
  console.log("│ Model ID                             │ Name                     │ Description / Info                                   │");
  console.log("├──────────────────────────────────────┼──────────────────────────┼──────────────────────────────────────────────────────┤");

  for (const m of res.models) {
    const desc = m.description ? m.description.slice(0, 50) : "-";
    console.log(
      `│ ${(m.id || "").padEnd(36)} │ ${(m.name || "").padEnd(24)} │ ${desc.padEnd(52)} │`
    );
  }
  console.log("└──────────────────────────────────────┴──────────────────────────┴──────────────────────────────────────────────────────┘");
  console.log(`\n💡 To switch active model: npm run zxa:cli -- set-model ${id} <model_id>\n`);
}

async function connectProvider(args, flags) {
  let [providerInput, apiKey] = args;

  if (flags.browser || flags.web) {
    const id = PROVIDER_MAP[(providerInput || "gemini").toLowerCase()] || "g";
    openBrowser(`${ZXA_URL}/?provider=${id}`);
    return;
  }

  if (!providerInput) {
    console.error("❌ Error: Provider required. Usage: zxa connect <gemini|opencode> [apiKey|--free] [--model=<model>] [--browser]");
    process.exit(1);
  }

  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id || (id !== "g" && id !== "o")) {
    console.error(`❌ Error: Unknown provider "${providerInput}". Can connect "gemini" (g) or "opencode" (o).`);
    process.exit(1);
  }

  // Handle Gemini Google Account (OAuth / Email Login - like Antigravity)
  if (id === "g" && (flags.google || flags.oauth || flags["google-account"] || apiKey === "google")) {
    console.log(`\n🔑 Initiating Google Account sign-in (Like Antigravity / Google Code Assist)...`);
    const initRes = await zxaRequest(`/api/v1/zxa/connections/gemini/google-auth`, { method: "POST" });
    const authUrl = initRes.geminiAuth?.url;
    if (!authUrl) {
      console.log(`Gemini is already connected or failed to start Google sign-in.`);
      return;
    }

    console.log(`\n🌐 Opening Google Sign-in in your default browser...`);
    openBrowser(authUrl);
    console.log(`If the browser did not open automatically, visit this URL:`);
    console.log(`\n${authUrl}\n`);
    console.log(`1. Sign in with your Google email account.`);
    console.log(`2. Click "Allow" to authorize Google Code Assist.`);
    console.log(`3. Copy the authorization code shown by Google.\n`);

    const rl = createInterface({ input, output });
    const code = await rl.question("Paste Google authorization code: ");
    rl.close();

    if (!code || !code.trim()) {
      console.error("❌ Sign-in cancelled: No authorization code provided.");
      await zxaRequest(`/api/v1/zxa/connections/gemini/google-auth`, { method: "DELETE" }).catch(() => {});
      process.exit(1);
    }

    console.log(`\n⏳ Exchanging authorization code and saving credentials...`);
    try {
      const confirmRes = await zxaRequest(`/api/v1/zxa/connections/gemini/google-auth/confirm`, {
        method: "POST",
        body: { code: code.trim() },
      });
      const updated = confirmRes.providers?.find((p) => p.id === "g");
      console.log(`✅ Successfully connected Gemini via Google Account!`);
      console.log(`   Account: ${updated?.connectedAs || "Google Account"}`);
      console.log(`   Model:   ${updated?.model || "gemini-2.5-pro"}`);
      console.log(`   Method:  ${updated?.connectionMethod || "Google Account (OAuth)"}`);
      console.log(`\n💡 Run "npm run zxa:cli -- test gemini" to verify with a test prompt.\n`);
      return;
    } catch (err) {
      console.error(`❌ Google sign-in failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Handle OpenCode Free Built-in LLM mode
  if (id === "o" && (flags.free || apiKey === "free" || (!apiKey && flags.model?.includes("free")))) {
    const defaultFreeModel = flags.model ? flags.model.trim() : "opencode/nemotron-3-ultra-free";
    const payload = { apiKey: "free", model: defaultFreeModel };
    console.log(`\n🔗 Connecting OpenCode (Free Built-in LLM: ${defaultFreeModel}) to ZXA...`);
    const res = await zxaRequest(`/api/v1/zxa/connections/o`, {
      method: "PUT",
      body: payload,
    });
    const updated = res.providers.find((p) => p.id === "o");
    console.log(`✅ Successfully enabled OpenCode Free Built-in inference!`);
    console.log(`   Model: ${updated?.model || payload.model}`);
    console.log(`   Status: ${updated?.configured ? "Connected" : "Saved"}`);
    console.log(`\n💡 Run "npm run zxa:cli -- test o" to verify with a test prompt.\n`);
    return;
  }

  if (!apiKey) {
    if (id === "g") {
      const rl = createInterface({ input, output });
      console.log("\nChoose Gemini authentication method:");
      console.log("  1) Google Account (OAuth / Email Login - like Antigravity) [Recommended]");
      console.log("  2) Google AI Studio API Key");
      const choice = (await rl.question("\nEnter choice (1 or 2, default 1): ")).trim();
      if (!choice || choice === "1") {
        rl.close();
        return connectProvider(["gemini"], { ...flags, google: true });
      }
      apiKey = await rl.question("Enter Google AI Studio API key: ");
      rl.close();
    } else {
      const rl = createInterface({ input, output });
      apiKey = await rl.question(`Enter API key for OpenCode (or type 'free'): `);
      rl.close();
    }
  }

  if (id === "o" && apiKey?.trim().toLowerCase() === "free") {
    return connectProvider(["opencode"], { ...flags, free: true });
  }

  if (!apiKey || apiKey.trim().length < 8) {
    console.error("❌ Error: Valid API key is required (at least 8 characters).");
    process.exit(1);
  }

  const payload = { apiKey: apiKey.trim() };
  if (flags["base-url"] || flags.baseUrl) {
    payload.baseUrl = (flags["base-url"] || flags.baseUrl).trim();
  }
  if (flags.model) {
    payload.model = flags.model.trim();
  } else if (flags.latest && id === "g") {
    try {
      const modelsRes = await zxaRequest(`/api/v1/zxa/connections/${id}/models?apiKey=${encodeURIComponent(apiKey.trim())}`);
      if (modelsRes.models?.length) {
        payload.model = modelsRes.models[0].id;
        console.log(`🎯 Auto-selected latest model: ${payload.model}`);
      }
    } catch {
      payload.model = "gemini-2.5-flash";
    }
  }

  console.log(`\n🔗 Connecting ${id === "g" ? "Gemini" : "OpenCode"} to ZXA...`);
  const res = await zxaRequest(`/api/v1/zxa/connections/${id}`, {
    method: "PUT",
    body: payload,
  });

  const updated = res.providers.find((p) => p.id === id);
  console.log(`✅ Successfully connected ${updated?.name || id}!`);
  console.log(`   Model: ${updated?.model || flags.model || "default"}`);
  console.log(`   Status: ${updated?.configured ? "Connected" : "Saved"}`);
  console.log(`\n💡 Run "npm run zxa:cli -- test ${id}" to verify connection with a test prompt.\n`);
}

async function setModel(args, flags) {
  let [providerInput, model] = args;
  if (!providerInput) {
    console.error("❌ Error: Usage: zxa set-model <gemini|codex|opencode> <model_name|--latest>");
    process.exit(1);
  }
  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id) {
    console.error(`❌ Error: Unknown provider "${providerInput}".`);
    process.exit(1);
  }

  if (flags.latest || model === "latest") {
    const modelsRes = await zxaRequest(`/api/v1/zxa/connections/${id}/models`);
    if (modelsRes.models?.length) {
      model = modelsRes.models[0].id;
    } else {
      model = "gemini-2.5-flash";
    }
  }

  if (!model) {
    console.error("❌ Error: Model name required or pass --latest.");
    process.exit(1);
  }

  console.log(`\n⚙️ Setting model for ${providerInput} to "${model}"...`);
  const res = await zxaRequest(`/api/v1/zxa/connections/${id}`, {
    method: "PUT",
    body: { model: model.trim() },
  });

  const updated = res.providers.find((p) => p.id === id);
  console.log(`✅ Updated ${updated?.name || id} model: ${updated?.model}`);
}

async function disconnectProvider(args) {
  const [providerInput] = args;
  if (!providerInput) {
    console.error("❌ Error: Provider required. Usage: zxa disconnect <gemini|codex|opencode>");
    process.exit(1);
  }

  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id) {
    console.error(`❌ Error: Unknown provider "${providerInput}".`);
    process.exit(1);
  }

  console.log(`\n🔌 Disconnecting ${providerInput}...`);
  await zxaRequest(`/api/v1/zxa/connections/${id}`, {
    method: "DELETE",
  });
  console.log(`✅ Disconnected ${providerInput}.`);
}

async function testProvider(args, flags) {
  let providerInput = args[0] || "gemini";
  let prompt = args.slice(1).join(" ");

  if (flags.model) {
    const id = PROVIDER_MAP[providerInput.toLowerCase()];
    if (id) {
      await zxaRequest(`/api/v1/zxa/connections/${id}`, {
        method: "PUT",
        body: { model: flags.model.trim() },
      });
    }
  } else if (flags.latest) {
    const id = PROVIDER_MAP[providerInput.toLowerCase()];
    if (id) {
      const modelsRes = await zxaRequest(`/api/v1/zxa/connections/${id}/models`);
      if (modelsRes.models?.length) {
        await zxaRequest(`/api/v1/zxa/connections/${id}`, {
          method: "PUT",
          body: { model: modelsRes.models[0].id },
        });
      }
    }
  }

  if (providerInput.toLowerCase() === "parallel") {
    return testParallel(prompt);
  }

  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id) {
    console.error(`❌ Error: Unknown provider "${providerInput}". Choose: gemini, codex, opencode, or parallel.`);
    process.exit(1);
  }

  const providerName = id === "g" ? "Gemini" : id === "c" ? "Codex" : "OpenCode";

  if (!prompt) {
    prompt = `Respond with: 'Hello! ${providerName} is successfully connected to ZXA.' and state your model identifier.`;
  }

  console.log(`\n🚀 Testing ${providerName} via ZXA at ${ZXA_URL}...`);
  console.log(`📝 Prompt: "${prompt}"\n`);

  const startTime = Date.now();
  try {
    const res = await zxaRequest(`/api/v1/zxa/${id}/messages`, {
      method: "POST",
      body: { message: prompt },
    });

    const clientDuration = Date.now() - startTime;
    console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
    console.log(`│ Provider: ${providerName.padEnd(20)} Model: ${(res.connection?.model || "unknown").padEnd(41)}│`);
    console.log(`│ Latency:  ${formatDuration(res.durationMs || clientDuration).padEnd(20)} Usage: ${formatTokens(res.usage).padEnd(41)}│`);
    console.log("├──────────────────────────────────────────────────────────────────────────────┤");
    console.log("│ Response:                                                                    │");
    const responseLines = (res.message || "").trim().split("\n");
    for (const line of responseLines) {
      console.log(`│ ${line.padEnd(76).slice(0, 76)} │`);
      if (line.length > 76) {
        let rem = line.slice(76);
        while (rem.length > 0) {
          console.log(`│ ${rem.padEnd(76).slice(0, 76)} │`);
          rem = rem.slice(76);
        }
      }
    }
    console.log("└──────────────────────────────────────────────────────────────────────────────┘");
    console.log(`\n✅ ${providerName} test completed successfully! [${formatDuration(clientDuration)} total]\n`);
  } catch (err) {
    console.error(`\n❌ Test failed: ${err.message}\n`);
    process.exit(1);
  }
}

async function testParallel(prompt) {
  if (!prompt) {
    prompt = "State your model and confirm you are connected to ZXA.";
  }
  console.log(`\n⚡ Testing all configured providers in parallel...`);
  console.log(`📝 Prompt: "${prompt}"\n`);

  const startTime = Date.now();
  try {
    const res = await zxaRequest("/api/v1/zxa/parallel", {
      method: "POST",
      body: { message: prompt, providers: ["c", "g", "o"] },
    });

    const totalDuration = Date.now() - startTime;
    for (const result of res.results) {
      const name = result.provider === "g" ? "Gemini" : result.provider === "c" ? "Codex" : "OpenCode";
      if (result.ok) {
        console.log(`\n🟢 [${name}] (${result.response.connection?.model || "default"}, ${formatDuration(result.response.durationMs)}):`);
        console.log(`   ${result.response.message.replace(/\n/g, "\n   ")}`);
      } else {
        console.log(`\n🔴 [${name}]: ${result.error}`);
      }
    }
    console.log(`\n⚡ Parallel test completed in ${formatDuration(totalDuration)}.\n`);
  } catch (err) {
    console.error(`\n❌ Parallel test failed: ${err.message}\n`);
    process.exit(1);
  }
}

async function startChat(args) {
  const providerInput = args[0] || "gemini";
  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id) {
    console.error(`❌ Error: Unknown provider "${providerInput}".`);
    process.exit(1);
  }

  const providerName = id === "g" ? "Gemini" : id === "c" ? "Codex" : "OpenCode";
  console.log(`\n💬 Starting interactive chat with ${providerName} via ZXA (${ZXA_URL}).`);
  console.log(`   Type your message and press Enter. Type "exit" or "quit" to end.\n`);

  const rl = createInterface({ input, output });

  while (true) {
    const userInput = await rl.question(`[${providerName}] > `);
    if (!userInput.trim()) continue;
    if (userInput.trim().toLowerCase() === "exit" || userInput.trim().toLowerCase() === "quit") {
      console.log("👋 Goodbye!");
      rl.close();
      break;
    }

    try {
      const startTime = Date.now();
      const res = await zxaRequest(`/api/v1/zxa/${id}/messages`, {
        method: "POST",
        body: { message: userInput.trim() },
      });
      const duration = Date.now() - startTime;
      console.log(`\n${res.message.trim()}\n`);
      console.log(`[${formatDuration(res.durationMs || duration)} | ${formatTokens(res.usage)}]\n`);
    } catch (err) {
      console.error(`\n⚠️ Error: ${err.message}\n`);
    }
  }
}

function printHelp() {
  console.log(`
ZXA Provider CLI (Codex · Gemini · OpenCode)

Usage:
  node packages/zxa/cli.mjs <command> [arguments] [options]
  npm run zxa:cli -- <command> [arguments] [options]

Commands:
  status                               View ZXA health, providers, models, and usage metrics
  models [gemini|codex|opencode]       Fetch and list available / latest models
  open [gemini|codex|opencode]         Open the ZXA Connection Manager in your web browser
  connect <gemini|opencode> [key]      Connect provider (interactive, --google, or API key)
  set-model <gemini|codex|opencode> <model>
                                       Change active model for provider
  disconnect <gemini|codex|opencode>   Disconnect provider
  test [gemini|codex|opencode] [prompt]
                                       Send test prompt to model and measure response
  test parallel [prompt]               Send test prompt to all connected providers
  chat [gemini|codex|opencode]         Start interactive CLI chat session
  doctor                               Run preflight diagnostic checks on ZXA setup

Options:
  --google, --oauth                    Sign in with Google Account directly (like Antigravity)
  --browser, --web                     Open connection manager in your browser
  --free                               Connect OpenCode using built-in free LLM (no API key needed)
  --base-url=<url>                     Specify custom base URL (e.g. for Ollama / vLLM)
  --model=<model>                      Specify model for connect or test command
  --latest                             Auto-fetch and select the latest recommended model
  --help, -h                           Show this help message

Examples:
  npm run zxa:cli -- status
  npm run zxa:cli -- connect gemini --google
  npm run zxa:cli -- connect opencode --free
  npm run zxa:cli -- open gemini
  npm run zxa:cli -- models gemini
  npm run zxa:cli -- connect gemini AIzaSy... --latest
  npm run zxa:cli -- set-model gemini gemini-2.5-pro
  npm run zxa:cli -- test gemini "Hello from Gemini!"
  npm run zxa:cli -- test parallel "Compare latency across providers"
  npm run zxa:cli -- chat gemini
`);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const { positional, flags } = parseFlags(rawArgs);
  const command = positional[0] || (flags.help ? "help" : "status");
  const commandArgs = positional.slice(1);

  if (flags.help || flags.h || command === "help") {
    printHelp();
    return;
  }

  switch (command) {
    case "status":
      await showStatus();
      break;
    case "open":
    case "browse":
    case "web": {
      const target = commandArgs[0] ? PROVIDER_MAP[commandArgs[0].toLowerCase()] || commandArgs[0] : "g";
      openBrowser(`${ZXA_URL}/?provider=${target}`);
      break;
    }
    case "models":
      await showModels(commandArgs, flags);
      break;
    case "connect":
      await connectProvider(commandArgs, flags);
      break;
    case "set-model":
    case "model":
      await setModel(commandArgs, flags);
      break;
    case "disconnect":
      await disconnectProvider(commandArgs);
      break;
    case "test":
      await testProvider(commandArgs, flags);
      break;
    case "chat":
      await startChat(commandArgs);
      break;
    case "doctor":
    case "check":
      await runDoctor();
      break;
    default:
      console.error(`Unknown command: "${command}". Run with --help for options.`);
      process.exit(1);
  }
}

async function runDoctor() {
  console.log(`\n🩺 Running ZXA Environment & Server Preflight Diagnostics...\n`);
  let issues = 0;

  // 1. ZXA Runtime Health
  try {
    const health = await zxaRequest("/health");
    console.log(`✅ ZXA Runtime Service: Reachable at ${ZXA_URL} (status: ${health.status}, agent: ${health.agentId})`);
  } catch (err) {
    console.log(`❌ ZXA Runtime Service: Unreachable at ${ZXA_URL} (${err.message})`);
    issues++;
  }

  // 2. Web UI Serving
  try {
    const res = await fetch(`${ZXA_URL}/`, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    if (res.ok && html.includes("ZXA")) {
      console.log(`✅ ZXA Web UI: Serving at ${ZXA_URL}/`);
    } else {
      console.log(`⚠️ ZXA Web UI: Returned unexpected status ${res.status}`);
      issues++;
    }
  } catch (err) {
    console.log(`❌ ZXA Web UI: Cannot load frontend at ${ZXA_URL}/ (${err.message})`);
    issues++;
  }

  // 3. Provider Configurations
  try {
    const connections = await zxaRequest("/api/v1/zxa/connections");
    const configuredCount = connections.providers.filter(p => p.configured).length;
    console.log(`✅ Provider Configuration State: ${configuredCount}/${connections.providers.length} configured`);
    for (const p of connections.providers) {
      console.log(`   - ${p.name.padEnd(10)} [${p.id}]: ${p.configured ? "🟢 Connected" : "⚪ Unconfigured"} (Model: ${p.model || "default"})`);
    }
  } catch (err) {
    console.log(`❌ Provider Configuration: Failed to read (/api/v1/zxa/connections: ${err.message})`);
    issues++;
  }

  // 4. Models Catalog & Live Endpoint
  try {
    const models = await zxaRequest("/api/v1/zxa/connections/g/models");
    console.log(`✅ Gemini Models Endpoint: Functional (${models.models?.length || 0} models available, mode: ${models.live ? "live Google API" : "standard catalog"})`);
  } catch (err) {
    console.log(`❌ Gemini Models Endpoint: Error (${err.message})`);
    issues++;
  }

  // 5. External Google API Connectivity
  try {
    const probe = await fetch("https://generativelanguage.googleapis.com", { signal: AbortSignal.timeout(5000) });
    console.log(`✅ Google AI Studio Network Access: Reachable (HTTP ${probe.status})`);
  } catch (err) {
    console.log(`⚠️ Google AI Studio Network Access: Could not connect to generativelanguage.googleapis.com (${err.message})`);
  }

  console.log("\n-------------------------------------------------------------");
  if (issues === 0) {
    console.log(`🎉 ZXA Doctor: All preflight checks PASSED. Ready for requests!\n`);
  } else {
    console.log(`⚠️ ZXA Doctor: Found ${issues} issue(s). Check docker status or run 'npm run zxa:setup'.\n`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
