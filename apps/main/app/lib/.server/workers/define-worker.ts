import type { Job, JobsOptions, Processor } from "bullmq";

import { Queue as BullQueue, Worker as BullWorker } from "bullmq";

import { makeRedisClient } from "./redis.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWorker = Worker<any, any>;

export type EnqueueOptions = Omit<JobsOptions, "jobId"> & {
  /**
   * Unique job ID for deduplication. If provided with `replaceFinished: true`,
   * any completed/failed job with this ID will be removed first.
   */
  jobId?: string;
  /**
   * If true and jobId is provided, removes any existing completed/failed job
   * with the same ID before adding the new job. Active or queued jobs are
   * left untouched.
   */
  replaceFinished?: boolean;
};

export type JobStatus =
  | "completed"
  | "failed"
  | "queued"
  | "running"
  | undefined;

export type Worker<
  JobData = never,
  JobResult = never,
  QueueName extends string = string,
> = {
  bullQueue: BullQueue<JobData, JobResult, QueueName>;
  bullWorker: BullWorker<JobData, JobResult, QueueName>;
  /**
   * Adds a job to the queue, optionally replacing a completed/failed job with
   * the same ID.
   * */
  enqueue: (data: JobData, options?: EnqueueOptions) => Promise<Job>;
  /** Returns the simplified status of a job by its ID. */
  getJobStatus: (jobId: string) => Promise<JobStatus>;
  name: QueueName;
};

type MakeWorkerOptions = {
  defaultJobOptions?: JobsOptions;
  workerConcurrency?: number;
};

export const defineWorker = <
  JobData,
  JobResult,
  QueueName extends string = string,
>(
  name: QueueName,
  handler: Processor<JobData, JobResult, QueueName>,
  options: MakeWorkerOptions = {},
): Worker<JobData, JobResult, QueueName> => {
  const { defaultJobOptions, workerConcurrency = 10 } = options;

  const queue = new BullQueue(name, {
    connection: makeRedisClient(),
    defaultJobOptions: {
      // Without cleanup, completed/failed jobs accumulate indefinitely and
      // exhaust Redis memory (OOM). Prune completed after 1h, failed after 24h.
      removeOnComplete: { age: 86_400 },
      removeOnFail: { age: 604_800 },
      ...defaultJobOptions,
    },
  });

  const worker = new BullWorker(name, handler, {
    autorun: false,
    concurrency: workerConcurrency,
    connection: makeRedisClient(),
  });

  worker.on("active", (job) => {
    console.log(
      `[workers] BullWorker(name="${name}") started Job(id=${job.id}).`,
    );
  });

  worker.on("completed", (job) => {
    console.log(
      `[workers] BullWorker(name="${name}") completed Job(id=${job.id}).`,
    );
  });

  worker.on("failed", (job, error) => {
    if (job) {
      console.error(
        `[workers] BullWorker(name="${name}") failed Job(id=${job.id}):`,
        error,
      );
    } else {
      console.error(`[workers] BullWorker(name="${name}") failed Job:`, error);
    }
  });

  worker.on("error", (error) => {
    console.error(`[workers] BullWorker(name="${name}") error:`, error);
  });

  worker.on("stalled", (jobId) => {
    console.warn(
      `[workers] BullWorker(name="${name}") stalled Job(id=${jobId}).`,
    );
  });

  const enqueue = async (data: JobData, options: EnqueueOptions = {}) => {
    const { jobId, replaceFinished, ...jobOptions } = options;
    const existingJob = jobId ? await queue.getJob(jobId) : null;
    const existingState = await existingJob?.getState();

    console.log(
      `[workers] Enqueuing ${name} jobId=${jobId}, existingState=${existingState}`,
    );

    const canRemove =
      existingJob &&
      replaceFinished &&
      (existingState === "failed" || existingState === "completed");

    if (canRemove) {
      await existingJob.remove();
    }

    // Casts needed due to BullMQ's ExtractNameType/ExtractDataType inference
    type Add = typeof queue.add;
    return queue.add(
      name as unknown as Parameters<Add>[0],
      data as Parameters<Add>[1],
      {
        ...jobOptions,
        jobId,
      },
    );
  };

  const getJobStatus = async (jobId: string) => {
    const job = await queue.getJob(jobId);

    if (!job) return undefined;

    const state = await job.getState();

    switch (state) {
      case "active":
      case "waiting-children":
        return "running";

      case "completed":
        return "completed";

      case "delayed":
      case "prioritized":
      case "waiting":
        return "queued";

      case "failed":
        return "failed";

      case "unknown":
        return undefined;
    }
  };

  return {
    // Cast needed due to BullMQ's ExtractNameType/ExtractDataType inference
    bullQueue: queue as unknown as BullQueue<JobData, JobResult, QueueName>,
    bullWorker: worker,
    enqueue,
    getJobStatus,
    name,
  };
};
