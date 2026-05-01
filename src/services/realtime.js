import { API_BASE_URL } from "./api";

const toWsBaseUrl = () => {
  const origin = API_BASE_URL.replace(/\/api$/, "");
  return origin.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
};

export const createRealtimeUrl = ({ token, orderNumber, accessToken } = {}) => {
  const params = new URLSearchParams();
  if (token) {
    params.set("token", token);
  }
  if (orderNumber && accessToken) {
    params.set("orderNumber", orderNumber);
    params.set("accessToken", accessToken);
  }

  const query = params.toString();
  return `${toWsBaseUrl()}/ws${query ? `?${query}` : ""}`;
};

export const connectRealtime = ({ token, orderNumber, accessToken, onMessage, onError }) => {
  const socket = new WebSocket(createRealtimeUrl({ token, orderNumber, accessToken }));

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch (error) {
      onError?.(error);
    }
  };

  socket.onerror = (error) => {
    onError?.(error);
  };

  return socket;
};
