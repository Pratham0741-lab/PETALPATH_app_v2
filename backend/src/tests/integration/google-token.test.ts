/**
 * Google sign-in token verification, with genuinely signed tokens.
 *
 * Tokens are signed with a throwaway RSA key and the Google library is pointed
 * at its public half instead of Google's published certificates, so the
 * library's real checks run (signature, issuer, expiry, audience) alongside
 * ours (verified email). Client IDs here are stand-ins in Google's format: the
 * "configured" one plays the PetalPath web client, the "old" one the previous
 * project's client.
 */
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleIdToken } from '../../modules/users/google-token.js';
import { authService } from '../../modules/users/auth.service.js';

const CONFIGURED = '111111111111-configuredwebclient0000000000.apps.googleusercontent.com';
const SECOND = '333333333333-secondallowedclient000000000.apps.googleusercontent.com';
const OLD = '222222222222-oldprojectwebclient0000000000.apps.googleusercontent.com';
const OTHER = '444444444444-someoneelsesclient00000000000.apps.googleusercontent.com';

const KID = 'test-key-1';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const strangerKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

const b64url = (v: object | Buffer) =>
  (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString('base64url');

function idToken(claims: Record<string, unknown>, key = privateKey, kid = KID): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT', kid });
  const body = b64url({
    iss: 'https://accounts.google.com',
    aud: CONFIGURED,
    sub: '1234567890',
    email: 'parent@example.com',
    email_verified: true,
    iat: now,
    exp: now + 3600,
    ...claims,
  });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), key);
  return `${header}.${body}.${b64url(signature)}`;
}

/** A Google client that trusts the test key instead of fetching Google's certificates. */
function testClient(): OAuth2Client {
  const client = new OAuth2Client();
  (client as unknown as { getFederatedSignonCertsAsync: () => Promise<unknown> }).getFederatedSignonCertsAsync =
    async () => ({ certs: { [KID]: publicPem }, format: 'PEM' });
  return client;
}

const verify = (token: string, audiences: readonly string[] = [CONFIGURED]) =>
  verifyGoogleIdToken(testClient(), token, audiences);

describe('Google ID token verification', () => {
  it('accepts a token for the configured web client with a verified email', async () => {
    const payload = await verify(idToken({}));
    expect(payload.email).toBe('parent@example.com');
    expect(payload.aud).toBe(CONFIGURED);
  });

  it('accepts any client in a comma-separated list', async () => {
    await expect(verify(idToken({ aud: SECOND }), [CONFIGURED, SECOND])).resolves.toMatchObject({ aud: SECOND });
  });

  it("rejects a token issued for the old project's client", async () => {
    await expect(verify(idToken({ aud: OLD }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a token for any other audience', async () => {
    await expect(verify(idToken({ aud: OTHER }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it('requires Google to have verified the email address', async () => {
    await expect(verify(idToken({ email_verified: false }))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verify(idToken({ email_verified: undefined }))).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a wrong issuer, an expired token and a forged signature', async () => {
    await expect(verify(idToken({ iss: 'https://evil.example.com' }))).rejects.toMatchObject({ statusCode: 401 });
    const past = Math.floor(Date.now() / 1000) - 7200;
    await expect(verify(idToken({ iat: past, exp: past + 600 }))).rejects.toMatchObject({ statusCode: 401 });
    await expect(verify(idToken({}, strangerKey))).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects garbage and an empty audience list', async () => {
    await expect(verify('not-a-jwt')).rejects.toMatchObject({ statusCode: 401 });
    await expect(verify(idToken({}), [])).rejects.toMatchObject({ statusCode: 401 });
  });

  it('no longer accepts the old "mock-google-token-" shortcut', async () => {
    await expect(authService.verifyGoogleToken('mock-google-token-alice')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('POST /api/auth/google with a garbage token is a clean 401, not a 500', async () => {
    const res = await supertest(app).post('/api/auth/google').send({ idToken: 'garbage' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
