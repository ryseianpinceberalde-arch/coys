const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const getRealtimeUrl = (token, extraParams = {}) => {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams();

  if (token) {
    params.set("token", token);
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return trimTrailingSlash(`${wsProtocol}//${host}/ws${query ? `?${query}` : ""}`);
};
