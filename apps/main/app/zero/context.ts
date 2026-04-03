export type ZeroContext = {
  userId: number;
};

declare module "@rocicorp/zero" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface DefaultTypes {
    context: ZeroContext;
  }
}
