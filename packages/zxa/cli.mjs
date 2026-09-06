#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

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

async function connectProvider(args, flags) {
  let [providerInput, apiKey] = args;
  if (!providerInput) {
    console.error("❌ Error: Provider required. Usage: zxa connect <gemini|opencode> <apiKey> [--model=<model>]");
    process.exit(1);
  }

  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id || (id !== "g" && id !== "o")) {
    console.error(`❌ Error: Unknown provider "${providerInput}". Can connect "gemini" (g) or "opencode" (o).`);
    process.exit(1);
  }

  if (!apiKey) {
    const rl = createInterface({ input, output });
    apiKey = await rl.question(`Enter API key for ${id === "g" ? "Gemini" : "OpenCode"}: `);
    rl.close();
  }

  if (!apiKey || apiKey.trim().length < 8) {
    console.error("❌ Error: Valid API key is required (at least 8 characters).");
    process.exit(1);
  }

  const payload = { apiKey: apiKey.trim() };
  if (flags.model) {
    payload.model = flags.model.trim();
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

async function setModel(args) {
  const [providerInput, model] = args;
  if (!providerInput || !model) {
    console.error("❌ Error: Usage: zxa set-model <gemini|codex|opencode> <model_name>");
    process.exit(1);
  }
  const id = PROVIDER_MAP[providerInput.toLowerCase()];
  if (!id) {
    console.error(`❌ Error: Unknown provider "${providerInput}".`);
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
ZXA & Gemini Provider CLI

Usage:
  node packages/zxa/cli.mjs <command> [arguments] [options]
  npm run zxa:cli -- <command> [arguments] [options]

Commands:
  status                               View ZXA health, providers, models, and usage metrics
  connect <gemini|opencode> <apiKey>   Connect provider with API key
  set-model <gemini|codex|opencode> <model>
                                       Change active model for provider
  disconnect <gemini|codex|opencode>   Disconnect provider
  test [gemini|codex|opencode] [prompt]
                                       Send test prompt to model and measure response
  test parallel [prompt]               Send test prompt to all connected providers
  chat [gemini|codex|opencode]         Start interactive CLI chat session

Options:
  --model=<model>                      Specify model for connect or test command
  --help, -h                           Show this help message

Examples:
  npm run zxa:cli -- status
  npm run zxa:cli -- connect gemini AIzaSy... --model=gemini-2.5-flash
  npm run zxa:cli -- set-model gemini gemini-2.5-pro
  npm run zxa:cli -- test gemini "Hello from ZXA!"
  npm run zxa:cli -- test parallel
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
    case "connect":
      await connectProvider(commandArgs, flags);
      break;
    case "set-model":
    case "model":
      await setModel(commandArgs);
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
    default:
      console.error(`Unknown command: "${command}". Run with --help for options.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
