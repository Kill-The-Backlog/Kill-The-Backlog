import { z } from "zod";

const runOutputAssistantTextSchema = z.object({
  text: z.string(),
  type: z.literal("assistant-text"),
});

const runOutputErrorSchema = z.object({
  text: z.string(),
  type: z.literal("error"),
});

const runOutputStatusSchema = z.object({
  text: z.string(),
  type: z.literal("status"),
});

const runOutputDoneSchema = z.object({
  type: z.literal("done"),
});

export const runOutputEventSchema = z.discriminatedUnion("type", [
  runOutputAssistantTextSchema,
  runOutputDoneSchema,
  runOutputErrorSchema,
  runOutputStatusSchema,
]);

export type RunOutputEvent = z.infer<typeof runOutputEventSchema>;
