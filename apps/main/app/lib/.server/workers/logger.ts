const isDev = process.env["NODE_ENV"] === "development";

export type WorkerLogger = {
  error: LogFn;
  log: LogFn;
  warn: LogFn;
};

type LogFn = (message: string, options?: LogOptions) => void;

type LogOptions = {
  cause?: unknown;
  devDetails?: Record<string, unknown>;
};

export function createWorkerLogger(jobName: string): WorkerLogger {
  const prefix = `[${jobName}]`;

  function emit(
    method: "error" | "log" | "warn",
    message: string,
    options?: LogOptions,
  ) {
    const args: unknown[] = [`${prefix} ${message}`];
    if (options?.cause) args.push(options.cause);
    if (options?.devDetails && isDev) args.push(options.devDetails);
    console[method](...args);
  }

  return {
    error(message, options?) {
      emit("error", message, options);
    },
    log(message, options?) {
      emit("log", message, options);
    },
    warn(message, options?) {
      emit("warn", message, options);
    },
  };
}
