const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const createStatusError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getAllowedGoogleClientIds = () =>
  (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export const verifyGoogleIdToken = async (idToken) => {
  const allowedClientIds = getAllowedGoogleClientIds();
  if (!allowedClientIds.length) {
    throw createStatusError("Google sign-in is not configured on the server", 503);
  }

  const tokenInfoUrl = new URL(GOOGLE_TOKEN_INFO_URL);
  tokenInfoUrl.searchParams.set("id_token", String(idToken || "").trim());

  const response = await fetch(tokenInfoUrl);
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    throw createStatusError("Google sign-in failed. Please try again.", 401);
  }

  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw createStatusError("Google sign-in returned an invalid issuer", 401);
  }

  if (!allowedClientIds.includes(String(payload.aud || "").trim())) {
    throw createStatusError("Google sign-in is not allowed for this app", 401);
  }

  if (!payload.sub || !payload.email || !["true", true].includes(payload.email_verified)) {
    throw createStatusError("Google account email is not verified", 401);
  }

  return {
    googleId: String(payload.sub).trim(),
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name || payload.email).trim(),
    avatar: String(payload.picture || "").trim()
  };
};
