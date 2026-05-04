import type { Part } from "@opencode-ai/sdk/v2";
import type { Components } from "react-markdown";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "#lib/utils/cn.js";

export function TextPart({ part }: { part: Extract<Part, { type: "text" }> }) {
  if (!part.text) return null;
  return (
    // `relative` establishes a containing block for the `position: absolute`
    // `sr-only` footnote label that remark-gfm emits, so it can't escape the
    // scroll container and extend document height.
    <div className="border-border relative flex flex-col gap-3 rounded-md border p-4">
      <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {/* `part.text` has leading whitespaces for some reason. */}
        {part.text.trim()}
      </Markdown>
    </div>
  );
}

const markdownComponents: Components = {
  a: ({ className, href, node, ...props }) => {
    // Internal anchors (e.g. footnote back-references `#user-content-fnref-1`)
    // should scroll within the page, not open a new tab.
    const isInternal = href?.startsWith("#");
    return (
      <a
        className={cn(
          "text-primary decoration-primary underline-offset-2 hover:underline",
          className,
        )}
        href={href}
        {...(isInternal ? {} : { rel: "noreferrer", target: "_blank" })}
        {...props}
      />
    );
  },
  blockquote: ({ className, node, ...props }) => (
    <blockquote
      className={cn(
        "text-muted-foreground border-border border-l-2 pl-3 italic",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, node, ...props }) => (
    <code
      className={cn(
        "bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]",
        className,
      )}
      {...props}
    />
  ),
  h1: ({ className, node, ...props }) => (
    <h1
      className={cn(
        "font-heading mt-4 mb-2 text-base font-semibold",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, node, ...props }) => (
    <h2
      className={cn("font-heading mt-4 mb-2 text-sm font-semibold", className)}
      {...props}
    />
  ),
  h3: ({ className, node, ...props }) => (
    <h3
      className={cn("mt-3 mb-1.5 text-sm font-semibold", className)}
      {...props}
    />
  ),
  h4: ({ className, node, ...props }) => (
    <h4
      className={cn("mt-3 mb-1.5 text-sm font-semibold", className)}
      {...props}
    />
  ),
  h5: ({ className, node, ...props }) => (
    <h5
      className={cn("mt-3 mb-1.5 text-sm font-semibold", className)}
      {...props}
    />
  ),
  h6: ({ className, node, ...props }) => (
    <h6
      className={cn(
        "text-muted-foreground mt-3 mb-1.5 text-sm font-semibold",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, node, ...props }) => (
    <hr className={cn("border-border my-2", className)} {...props} />
  ),
  li: ({ className, node, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  ol: ({ className, node, ...props }) => (
    <ol
      className={cn(
        "marker:text-muted-foreground ml-5 list-decimal space-y-1",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, node, ...props }) => (
    <p className={cn("leading-relaxed", className)} {...props} />
  ),
  pre: ({ className, node, ...props }) => (
    <pre
      className={cn(
        "bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-xs",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, node, ...props }) => (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "border-border w-full border-collapse border text-xs",
          className,
        )}
        {...props}
      />
    </div>
  ),
  td: ({ className, node, ...props }) => (
    <td
      className={cn("border-border border px-2 py-1", className)}
      {...props}
    />
  ),
  th: ({ className, node, ...props }) => (
    <th
      className={cn(
        "border-border border px-2 py-1 text-left font-semibold",
        className,
      )}
      {...props}
    />
  ),
  thead: ({ className, node, ...props }) => (
    <thead className={cn("bg-muted", className)} {...props} />
  ),
  ul: ({ className, node, ...props }) => (
    <ul
      className={cn(
        "marker:text-muted-foreground ml-5 list-disc space-y-1",
        className,
      )}
      {...props}
    />
  ),
};
