import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelProviderSelector } from "./ModelProviderSelector.js";
import { FALLBACK_MODELS, FALLBACK_PROVIDERS } from "../model-provider-api.js";

describe("ModelProviderSelector", () => {
  const createWrapper = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  it("renders the active provider and model pill in idle state", () => {
    const Wrapper = createWrapper();
    const html = renderToString(
      <Wrapper>
        <ModelProviderSelector
          activeProvider="g"
          activeModel="gemini-2.5-pro"
          onSelect={() => {}}
        />
      </Wrapper>
    );

    expect(html).toContain("Gemini");
    expect(html).toContain("gemini-2.5-pro");
    expect(html).toContain("Select AI Model Provider");
  });

  it("renders live processing status when sending", () => {
    const Wrapper = createWrapper();
    const html = renderToString(
      <Wrapper>
        <ModelProviderSelector
          activeProvider="g"
          activeModel="gemini-2.5-pro"
          onSelect={() => {}}
          sending={true}
          statusText="Asking Gemini (gemini-2.5-pro)…"
        />
      </Wrapper>
    );

    expect(html).toContain("role=\"status\"");
    expect(html).toContain("Asking Gemini (gemini-2.5-pro)…");
    expect(html).toContain("animate-spin");
  });

  it("renders queued message status when prompts are queued", () => {
    const Wrapper = createWrapper();
    const html = renderToString(
      <Wrapper>
        <ModelProviderSelector
          activeProvider="o"
          activeModel="opencode/nemotron-3-ultra-free"
          onSelect={() => {}}
          queuedCount={2}
        />
      </Wrapper>
    );

    expect(html).toContain("role=\"status\"");
    expect(html).toContain("2 messages waiting for your steer");
  });

  it("renders OpenCode and Codex active providers correctly", () => {
    const Wrapper = createWrapper();
    const opencodeHtml = renderToString(
      <Wrapper>
        <ModelProviderSelector
          activeProvider="o"
          activeModel="opencode/nemotron-3-ultra-free"
          onSelect={() => {}}
        />
      </Wrapper>
    );
    expect(opencodeHtml).toContain("OpenCode");
    expect(opencodeHtml).toContain("nemotron-3-ultra");

    const codexHtml = renderToString(
      <Wrapper>
        <ModelProviderSelector
          activeProvider="c"
          activeModel="account default"
          onSelect={() => {}}
        />
      </Wrapper>
    );
    expect(codexHtml).toContain("Codex");
    expect(codexHtml).toContain("account default");
  });

  it("contains complete fallback providers and models", () => {
    expect(FALLBACK_PROVIDERS).toHaveLength(3);
    expect(FALLBACK_MODELS.g.length).toBeGreaterThanOrEqual(5);
    expect(FALLBACK_MODELS.o.length).toBeGreaterThanOrEqual(3);
    expect(FALLBACK_MODELS.c.length).toBeGreaterThanOrEqual(3);

    const geminiIds = FALLBACK_MODELS.g.map((m) => m.id);
    expect(geminiIds).toContain("gemini-2.5-pro");
    expect(geminiIds).toContain("gemini-2.5-flash");
    expect(geminiIds).toContain("gemini-3.1-pro-preview");

    const opencodeIds = FALLBACK_MODELS.o.map((m) => m.id);
    expect(opencodeIds).toContain("opencode/nemotron-3-ultra-free");
  });
});
