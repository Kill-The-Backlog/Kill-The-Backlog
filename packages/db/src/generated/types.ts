import type { ColumnType } from "kysely";
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type GoogleAccount = {
  id: Generated<number>;
  userId: number;
  googleId: string;
  oauthAccessToken: string;
  oauthRefreshToken: string;
  oauthExpiry: string;
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
  GoogleAccount: GoogleAccount;
  User: User;
};
