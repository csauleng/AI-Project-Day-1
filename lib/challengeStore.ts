// Shared in-memory challenge store for WebAuthn
// In production, use a database or Redis for distributed environments
export const challengeStore = new Map<string, string>()
