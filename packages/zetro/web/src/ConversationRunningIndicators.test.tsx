import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationTabs } from "./ConversationTabs.js";
import { ConversationSideCar } from "./ConversationSideCar.js";
import type { Conversation, Project } from "./conversations.js";

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const mockConversations: Conversation[] = [
  {
    id: "c-1",
    title: "q-cafe intro",
    projectId: "proj-1",
    pinned: false,
    archived: false,
    updatedAt: new Date(2026, 8, 3, 10).toISOString(),
    exchanges: [],
  },
  {
    id: "c-2",
    title: "info",
    projectId: undefined,
    pinned: false,
    archived: false,
    updatedAt: new Date(2026, 8, 3, 11).toISOString(),
    exchanges: [],
  },
];

const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "q-cafe",
    localFolder: "apps/q-cafe",
    pinned: true,
    kind: "project",
  },
];

describe("Running indicators", () => {
  describe("ConversationTabs", () => {
    it("renders a spinner on running task tabs and bot icon on idle tabs", () => {
      const runningHtml = renderToString(
        <ConversationTabs
          activeId="c-1"
          conversations={mockConversations}
          openIds={["c-1", "c-2"]}
          runningIds={new Set(["c-1"])}
          onClose={() => {}}
          onNew={() => {}}
          onSelect={() => {}}
        />
      );

      expect(runningHtml).toContain("Response running");
      expect(runningHtml).toContain("animate-spin");

      const idleHtml = renderToString(
        <ConversationTabs
          activeId="c-1"
          conversations={mockConversations}
          openIds={["c-1", "c-2"]}
          runningIds={new Set()}
          onClose={() => {}}
          onNew={() => {}}
          onSelect={() => {}}
        />
      );

      expect(idleHtml).not.toContain("Response running");
    });
  });

  describe("ConversationSideCar", () => {
    it("renders floating bouncing dots on running chat items and spinners on running projects", () => {
      const Wrapper = createWrapper();
      const html = renderToString(
        <Wrapper>
          <ConversationSideCar
            conversations={mockConversations}
            projects={mockProjects}
            activeId="c-1"
            runningIds={new Set(["c-1"])}
            onSelect={() => {}}
            onNew={() => {}}
          />
        </Wrapper>
      );

      expect(html).toContain("Agent responding");
      expect(html).toContain("animate-bounce");
      expect(html).toContain("Running tasks in project");
      expect(html).toContain("Tasks running in projects");
      expect(html).toContain("animate-spin");
    });

    it("renders unassigned section spinner when an unassigned chat is running", () => {
      const Wrapper = createWrapper();
      const html = renderToString(
        <Wrapper>
          <ConversationSideCar
            conversations={mockConversations}
            projects={mockProjects}
            activeId="c-2"
            runningIds={new Set(["c-2"])}
            onSelect={() => {}}
            onNew={() => {}}
          />
        </Wrapper>
      );

      expect(html).toContain("Agent responding");
      expect(html).toContain("animate-bounce");
      expect(html).toContain("Running tasks in conversations");
      expect(html).not.toContain("Running tasks in project");
    });

    it("does not render running indicators when runningIds is empty", () => {
      const Wrapper = createWrapper();
      const html = renderToString(
        <Wrapper>
          <ConversationSideCar
            conversations={mockConversations}
            projects={mockProjects}
            activeId="c-1"
            runningIds={new Set()}
            onSelect={() => {}}
            onNew={() => {}}
          />
        </Wrapper>
      );

      expect(html).not.toContain("Agent responding");
      expect(html).not.toContain("animate-bounce");
      expect(html).not.toContain("Running tasks in project");
      expect(html).not.toContain("Tasks running in projects");
      expect(html).not.toContain("Running tasks in conversations");
    });
  });
});
