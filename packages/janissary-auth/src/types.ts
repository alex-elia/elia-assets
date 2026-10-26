export type Principal =
  | { kind: "anonymous" }
  | { kind: "user"; id: string; email?: string | null };

export type SessionSnapshot = {
  userId: string;
  email?: string | null;
  expiresAt?: number;
};

export type IdentityProvider = {
  getUser(): Promise<{ user: SessionSnapshot | null; error?: Error | null }>;
  signOut(): Promise<{ error?: Error | null }>;
};
