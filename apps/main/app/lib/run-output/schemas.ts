import { z } from "zod";

const runOutputTextSchema = z.object({
  stepId: z.string().optional(),
  text: z.string(),
  type: z.literal("text"),
});

const runOutputErrorSchema = z.object({
  stepId: z.string().optional(),
  text: z.string(),
  type: z.literal("error"),
});

const runOutputStepStartSchema = z.object({
  label: z.string(),
  stepId: z.string(),
  type: z.literal("step-start"),
});

const runOutputStepEndSchema = z.object({
  status: z.enum(["completed", "failed"]),
  stepId: z.string(),
  type: z.literal("step-end"),
});

const runOutputDoneSchema = z.object({
  type: z.literal("done"),
});

export const runOutputEventSchema = z.discriminatedUnion("type", [
  runOutputTextSchema,
  runOutputDoneSchema,
  runOutputErrorSchema,
  runOutputStepStartSchema,
  runOutputStepEndSchema,
]);

export type RunOutputEvent = z.infer<typeof runOutputEventSchema>;
