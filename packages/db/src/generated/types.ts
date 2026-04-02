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
  User: User;
};
