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
export type GitHubRepo = {
  id: Generated<number>;
  userId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  ownerLogin: string;
  ownerAvatarUrl: string | null;
  description: string | null;
  htmlUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type KanbanCard = {
  id: string;
  repoId: number;
  userId: number;
  title: string;
  columnId: string;
  sortOrder: string;
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
  GitHubRepo: GitHubRepo;
  KanbanCard: KanbanCard;
  User: User;
};
