import type { ColumnType } from "kysely";
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

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
  initialPrompt: string;
  title: string | null;
  repoFullName: string;
  baseBranch: string;
  e2bSandboxId: string | null;
  opencodeSessionId: string | null;
  prNumber: number | null;
  todos: unknown | null;
  summary: unknown | null;
  errorMessage: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type SessionMessage = {
  id: string;
  opencodeId: string;
  sessionId: string;
  role: string;
  opencodeCreatedAt: Timestamp;
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
  SessionMessage: SessionMessage;
  SessionMessagePart: SessionMessagePart;
  User: User;
};
