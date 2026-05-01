# Google Sign-In Troubleshooting

Use this when Google sign-in starts failing again with:

- `Access blocked: This app's request is invalid`
- `Error 400: redirect_uri_mismatch`
- Android `DEVELOPER_ERROR`
- `Access to the WebCrypto API is restricted to secure origins (localhost/https).`

## Current project setup

- Expo app Google auth code: `src/components/GoogleAuthButton.js`
- Expo backend token verification: `backend/src/utils/googleAuth.js`
- Expo backend auth controller: `backend/src/controllers/authController.js`
- Expo app config: `app.json`
- Expo web startup script: `scripts/start-web-localhost.cjs`
- Expo app env: `.env.local`
- Backend env: `backend/.env`
- Separate website Google login: `frontend/src/components/GoogleSignInButton.jsx`

This repo has two different browser login implementations:

- Expo app web login uses `expo-auth-session`
- Separate `frontend/` website uses Google Identity Services directly

Do not mix those two flows when debugging.

## Correct client usage in this repo

### Expo app on web

Use the Web OAuth client ID:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Current value: `772891421754-afd1n0hktsn47q9r4a719ih1nnaq4q7l.apps.googleusercontent.com`

### Expo app on Android

Native Google sign-in is configured with the Web client ID in `GoogleSignin.configure({ webClientId })`.

That is intentional. The Android OAuth client must still exist in Google Cloud for package name and SHA-1 registration:

- Android package: `com.ryse.coys`
- Android OAuth client ID: `772891421754-09sap474e781ktjsrq43trvkidtdq3o0.apps.googleusercontent.com`
- Debug SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

### Backend verification

The backend currently accepts both the Web and Android client IDs through:

- `GOOGLE_CLIENT_IDS` in `backend/.env`

## Exact redirect URI to use

The Expo app web flow is pinned to:

- `http://localhost:8081`

That same URL must be added to the Google Cloud Web OAuth client in both places:

- `Authorized JavaScript origins`
- `Authorized redirect URIs`

## Fast fix checklist

When `redirect_uri_mismatch` happens again, do these in order:

1. Run `npm run web`
2. Open the login screen
3. Look under the Google button for `Google OAuth redirect URI: ...`
4. Confirm it is exactly `http://localhost:8081`
5. If it is not, stop whatever is using port `8081` and rerun `npm run web`
6. Open Google Cloud Console and edit the Web OAuth client
7. Make sure `http://localhost:8081` exists in both:
   - `Authorized JavaScript origins`
   - `Authorized redirect URIs`
8. Retry sign-in

## If web crashes before Google opens

If you see:

- `Access to the WebCrypto API is restricted to secure origins (localhost/https).`

Then the app is not running on a secure web origin.

Do this:

1. Open the app from `http://localhost:8081`
2. Do not use a LAN IP like `http://192.168.x.x:8081`
3. Do not use plain `http` on a custom hostname
4. If you must use a non-localhost hostname, use HTTPS

## If Android sign-in fails

If web works but Android fails with `DEVELOPER_ERROR`, check these:

1. Google Cloud Android OAuth client package name is `com.ryse.coys`
2. Google Cloud Android OAuth client SHA-1 is `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
3. `.env.local` still contains the correct Web and Android client IDs
4. Backend `GOOGLE_CLIENT_IDS` still includes the Web client ID and Android client ID
5. Rebuild the Android app if native config changed

## Files to inspect first

If the issue comes back, inspect these files first:

1. `src/components/GoogleAuthButton.js`
2. `.env.local`
3. `backend/.env`
4. `app.json`
5. `scripts/start-web-localhost.cjs`

## What not to change casually

- Do not replace Android native `webClientId` with the Android client ID in `GoogleSignin.configure(...)`
- Do not change the Expo web port unless you also update the Google Web OAuth client
- Do not debug the Expo app and the separate `frontend/` website as if they were the same login flow

## Expected behavior after the fix

- Expo web login uses the Web OAuth client
- Expo Android login uses native Google sign-in and sends an ID token the backend accepts
- The redirect URI shown in development stays stable at `http://localhost:8081`
- Google sign-in works on both web and Android without `redirect_uri_mismatch`
