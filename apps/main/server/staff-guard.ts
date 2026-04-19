import type { Handler } from "express";

import { authCookieStorage } from "#lib/.server/auth/cookie.js";
import { db } from "#lib/.server/clients/db.js";

export const staffGuard: Handler = async (req, res, next) => {
  const cookie = await authCookieStorage.getSession(req.headers.cookie);
  const userId = cookie.data.userId;

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
