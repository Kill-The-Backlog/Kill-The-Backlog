import type { Handler } from "express";

import { sessionStorage } from "#lib/.server/auth/session.js";
import { db } from "#lib/.server/clients/db.js";

export const staffGuard: Handler = async (req, res, next) => {
  const session = await sessionStorage.getSession(req.headers.cookie);
  const userId = session.data.userId;

  if (!userId) {
    res.status(401).send("Unauthorized");
    return;
  }

  const user = await db
    .selectFrom("User")
    .select("isStaff")
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!user?.isStaff) {
    res.status(403).send("Forbidden");
    return;
  }

  next();
};
