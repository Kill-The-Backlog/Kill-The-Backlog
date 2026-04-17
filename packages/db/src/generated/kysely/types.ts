import type { ColumnType } from "kysely";
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const SandboxStatus = {
  idle: "idle",
  provisioning: "provisioning",
  ready: "ready",
  pausing: "pausing",
  paused: "paused",
  resuming: "resuming",
  terminated: "terminated",
  errored: "errored",
} as const;
export type SandboxStatus = (typeof SandboxStatus)[keyof typeof SandboxStatus];
export const SessionCommandStatus = {
  pending: "pending",
  processing: "processing",
  done: "done",
  failed: "failed",
} as const;
export type SessionCommandStatus =
  (typeof SessionCommandStatus)[keyof typeof SessionCommandStatus];
export type GitHubAccount = {
  id: Generated<number>;
  userId: number;
  githubId: number;
  login: string;
  oauthAccessToken: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type Session = {
  id: string;
  userId: number;
  prompt: string;
  e2bSandboxId: string | null;
  opencodeSessionId: string | null;
  sandboxStatus: Generated<SandboxStatus>;
  lastActivityAt: Generated<Timestamp>;
  todos: unknown | null;
  summary: unknown | null;
  errorMessage: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type SessionCommand = {
  id: string;
  sessionId: string;
  type: string;
  payload: unknown;
  status: Generated<SessionCommandStatus>;
  error: string | null;
  createdAt: Generated<Timestamp>;
  processedAt: Timestamp | null;
  updatedAt: Timestamp;
};
export type SessionMessage = {
  id: string;
  opencodeId: string;
  sessionId: string;
  role: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type SessionMessagePart = {
  id: string;
  opencodeId: string;
  messageId: string;
  type: string;
  data: unknown;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type User = {
  id: Generated<number>;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isStaff: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type DB = {
  GitHubAccount: GitHubAccount;
  Session: Session;
  SessionCommand: SessionCommand;
  SessionMessage: SessionMessage;
  SessionMessagePart: SessionMessagePart;
  User: User;
};
