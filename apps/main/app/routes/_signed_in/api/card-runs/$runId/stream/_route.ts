import { data } from "react-router";
import { eventStream } from "remix-utils/sse/server";

import { requireUser } from "#lib/.server/auth/auth-context.js";
import { db } from "#lib/.server/clients/db.js";
import { redis } from "#lib/.server/clients/redis.js";
import { runOutputEventSchema } from "#lib/run-output.js";
import { cardRunOutputKey } from "#workers/.server/card-run.js";

import type { Route } from "./+types/_route.js";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const { user } = await requireUser(context);
  const { runId } = params;

  const run = await db
    .selectFrom("CardRun")
    .innerJoin("GitHubRepo", "GitHubRepo.id", "CardRun.repoId")
    .select("CardRun.id")
    .where("CardRun.id", "=", runId)
    .where("GitHubRepo.userId", "=", user.id)
    .executeTakeFirst();

  if (!run) {
    throw data({ error: "Run not found" }, { status: 404 });
  }

  const redisKey = cardRunOutputKey(runId);

  return eventStream(request.signal, function setup(send, abort) {
    let cursor = 0;
    let timeout: NodeJS.Timeout;

    const poll = async () => {
      try {
        const chunks = await redis.lrange(redisKey, cursor, -1);

        for (const chunk of chunks) {
          const parsed = runOutputEventSchema.parse(JSON.parse(chunk));
          if (parsed.type === "done") {
            send({ data: "{}", event: "done" });
            abort();
            return;
          }

          send({ data: chunk });
        }

        cursor += chunks.length;
      } catch (error) {
        abort();
        throw error;
      }

      // @todo: Keeps polling if the worker crashes without writing the done
      // sentinel.
      timeout = setTimeout(() => void poll(), 300);
    };

    void poll();

    return () => {
      clearTimeout(timeout);
    };
  });
}
