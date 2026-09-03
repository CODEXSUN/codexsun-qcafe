import { ScrollArea } from "@codexsun/ui/components/ui/scroll-area";
import type { WorkspaceContent as WorkspaceContentModel } from "./workspace-navigation-data.js";

type WorkspaceContentProps = {
  content: WorkspaceContentModel;
};

export function WorkspaceContent({ content }: WorkspaceContentProps) {
  return (
    <ScrollArea className="h-full min-h-0 w-full [&_[data-orientation=vertical]]:w-1 [&_[data-orientation=vertical]]:p-px">
      <article className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-8 p-8 pr-10 sm:p-10 sm:pr-12">
        <header className="space-y-3 border-b border-border pb-8">
          <p className="text-sm font-medium text-muted-foreground">{content.eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{content.title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{content.description}</p>
        </header>
        <div className="space-y-6">
          {content.details.map((detail, index) => (
            <section key={detail} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Step {index + 1}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{detail}</p>
            </section>
          ))}
        </div>
      </article>
    </ScrollArea>
  );
}
