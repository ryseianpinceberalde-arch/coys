const FACEBOOK_GRAPH_BASE_URL = "https://graph.facebook.com";

const createStatusError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createFacebookFallbackEmail = (facebookId) => `facebook-user-${facebookId}@facebook.local`;

const looksLikeFacebookAppId = (value) => /^\d{8,}$/.test(String(value || "").trim());

const looksLikeFacebookAppSecret = (value) => /^[a-f0-9]{32}$/i.test(String(value || "").trim());

const resolveFacebookConfig = () => {
  let appId = String(process.env.FACEBOOK_APP_ID || "").trim();
  let appSecret = String(process.env.FACEBOOK_APP_SECRET || "").trim();

  // Tolerate swapped values in envs because Meta app IDs are numeric and app secrets are hex strings.
  if (looksLikeFacebookAppSecret(appId) && looksLikeFacebookAppId(appSecret)) {
    [appId, appSecret] = [appSecret, appId];
  }

  if (!appId || !appSecret) {
    throw createStatusError("Facebook sign-in is not configured on the server", 503);
  }

  return { appId, appSecret };
};

const fetchGraphPayload = async (path, params) => {
  const url = new URL(path, FACEBOOK_GRAPH_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || payload.error) {
    throw createStatusError(
      payload?.error?.message || "Facebook sign-in failed. Please try again.",
      401
    );
  }

  return payload;
};

export const verifyFacebookAccessToken = async (accessToken) => {
  const trimmedAccessToken = String(accessToken || "").trim();
  if (!trimmedAccessToken) {
    throw createStatusError("Facebook sign-in did not return an access token", 400);
  }

  const { appId, appSecret } = resolveFacebookConfig();
  const debugPayload = await fetchGraphPayload("/debug_token", {
    input_token: trimmedAccessToken,
    access_token: `${appId}|${appSecret}`,
  });

  const tokenData = debugPayload.data;
  if (!tokenData?.is_valid) {
    throw createStatusError("Facebook sign-in failed. Please try again.", 401);
  }

  if (String(tokenData.app_id || "").trim() !== appId) {
    throw createStatusError("Facebook sign-in is not allowed for this app", 401);
  }

  const profile = await fetchGraphPayload("/me", {
    access_token: trimmedAccessToken,
    fields: "id,name,email,picture.type(large)",
  });

  if (!profile.id) {
    throw createStatusError("Facebook sign-in did not return a valid profile", 401);
  }

  const facebookId = String(profile.id).trim();
  const email = String(profile.email || "").trim().toLowerCase();

  return {
    facebookId,
    email,
    fallbackEmail: createFacebookFallbackEmail(facebookId),
    name: String(profile.name || email || `Facebook User ${facebookId}`).trim(),
    avatar: String(profile.picture?.data?.url || "").trim(),
  };
};
