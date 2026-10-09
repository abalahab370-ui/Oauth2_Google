# Google OAuth 2.0 API (Prototype)

This repository is an early Node.js/Express prototype for accepting a Google ID token, verifying it with Google's OAuth client, and issuing application access and refresh tokens.

## Intended Authentication Flow

1. A frontend obtains a Google ID token using Google Identity Services.
2. The frontend sends the token to the API as JSON: `{ "token": "<google-id-token>" }`.
3. The API verifies the token for the configured Google client ID and checks that Google's email verification succeeded.
4. The API finds or creates the user, returns a short-lived access token, and sets a refresh-token cookie.

## Current Status

This is not yet a runnable, end-to-end application. Before using it, complete the database integration and resolve the server wiring issues:

- `Oauth2.js` imports `../db.js`, but no database client is included in this repository. The handler expects a Prisma-style `db.user` and `db.refreshToken` API.
- The route in `server.js` is mounted as `api/auth/google` without a leading `/`; use `/api/auth/google` for the intended endpoint.
- The cookie configuration currently uses `sameSite: 'Non'`, which is not a valid SameSite value. Use a supported value such as `'None'` (with `secure: true`) when cross-site cookies are required.
- `server.js` does not load `.env`; provide environment variables through the runtime or add a dotenv setup.

## Configuration

The implementation expects these environment variables:

```env
PORT=5000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
```

Never commit real credentials or signing secrets. Configure the OAuth client ID in Google Cloud Console and use the same client ID in the frontend and API.

## Dependencies and Command

The project uses Express, `google-auth-library`, and `jsonwebtoken`.

```bash
npm install
npm run dev
```

The command starts `server.js`, but the application will not complete authentication until the database integration and wiring issues above are fixed.
