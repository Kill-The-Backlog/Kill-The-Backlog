import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    url: env("DB_URL"),
  },
});
