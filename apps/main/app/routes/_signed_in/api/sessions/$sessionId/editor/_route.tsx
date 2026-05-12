import { renderToStaticMarkup } from "react-dom/server";
import { data } from "react-router";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { getSessionEditorPassword } from "#lib/.server/session-editor/password.js";
import { EDITOR_STATUS, editorBaseUrl } from "#lib/session-editor.js";

import type { Route } from "./+types/_route";

export const loader = async ({ context, params }: Route.LoaderArgs) => {
  const { user } = await requireUser(context);
  const sessionId = params.sessionId;

  const session = await db
    .selectFrom("Session")
    .select(["e2bSandboxId", "editorStatus"])
    .where("id", "=", sessionId)
    .where("userId", "=", user.id)
    .executeTakeFirst();
  if (!session) {
    throw data({ error: "Session not found" }, { status: 404 });
  }
  if (!session.e2bSandboxId) {
    throw data(
      { error: "Session has not finished bootstrapping" },
      { status: 409 },
    );
  }
  if (session.editorStatus !== EDITOR_STATUS.running) {
    throw data({ error: "VS Code is not ready" }, { status: 409 });
  }

  const loginUrl = new URL("/login", editorBaseUrl(session.e2bSandboxId));
  loginUrl.searchParams.set("to", "/");

  return new Response(
    renderLaunchPage({
      loginUrl: loginUrl.toString(),
      password: getSessionEditorPassword(sessionId),
    }),
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
};

function renderLaunchPage({
  loginUrl,
  password,
}: {
  loginUrl: string;
  password: string;
}): string {
  return `<!doctype html>${renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="no-referrer" name="referrer" />
        <title>Opening VS Code</title>
      </head>
      <body>
        <p>Opening VS Code...</p>
        <form action={loginUrl} method="post">
          <input name="password" type="hidden" value={password} />
          <noscript>
            <button type="submit">Continue to VS Code</button>
          </noscript>
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.forms[0]?.submit();",
          }}
        />
      </body>
    </html>,
  )}`;
}
