// Provider implementations must verify issuer, audience, expiry and nonce before
// returning an identity. No client-provided email is accepted as proof of identity.
export type OAuthProvider = "apple" | "google";
export interface VerifiedIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
}
export interface OAuthVerifier {
  verify(idToken: string, nonce: string): Promise<VerifiedIdentity>;
}
