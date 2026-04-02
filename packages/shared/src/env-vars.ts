import { z } from "zod";

export const zBooleanString = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requireEnvVars = <T extends z.ZodObject<any>>(
  schema: T,
  env: Record<string, unknown>,
): z.infer<T> => {
  const validated = schema.safeParse(env);

  if (!validated.success) {
    throw new Error(
      [
        "The following environment variables had issues:",
        ...validated.error.issues.map(
          (issue) => ` - ${issue.path[0]?.toString()}: ${issue.message}`,
        ),
      ].join("\n"),
    );
  }

  return validated.data;
};
