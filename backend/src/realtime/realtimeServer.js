import { URL } from "url";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { serializeOrder } from "../utils/orderPresentation.js";

let wss = null;
const SOCKET_OPEN = 1;

const clientState = new WeakMap();
const staffClients = new Set();
const userClients = new Map();
const guestOrderClients = new Map();

const addClientToMap = (map, key, ws) => {
  if (!key) {
    return;
  }

  const clients = map.get(key) || new Set();
  clients.add(ws);
  map.set(key, clients);
};

const removeClientFromMap = (map, key, ws) => {
  if (!key || !map.has(key)) {
    return;
  }

  const clients = map.get(key);
  clients.delete(ws);

  if (!clients.size) {
    map.delete(key);
  }
};

const sendJson = (ws, payload) => {
  if (!ws || ws.readyState !== SOCKET_OPEN) {
    return;
  }

  ws.send(JSON.stringify(payload));
};

const buildGuestKey = (orderNumber, accessToken) =>
  orderNumber && accessToken ? `${orderNumber}:${accessToken}` : "";

const removeClient = (ws) => {
  const state = clientState.get(ws);
  if (!state) {
    return;
  }

  if (state.kind === "staff") {
    staffClients.delete(ws);
  }

  if (state.kind === "user") {
    removeClientFromMap(userClients, state.userId, ws);
  }

  if (state.kind === "guest") {
    removeClientFromMap(guestOrderClients, state.guestKey, ws);
  }

  clientState.delete(ws);
};

const connectUserClient = (ws, user) => {
  const userId = String(user._id);

  if (user.role === "admin" || user.role === "staff") {
    staffClients.add(ws);
    clientState.set(ws, { kind: "staff", userId, role: user.role });
  } else {
    addClientToMap(userClients, userId, ws);
    clientState.set(ws, { kind: "user", userId, role: user.role });
  }

  sendJson(ws, {
    type: "connected",
    data: {
      role: user.role,
      userId
    }
  });
};

const connectGuestOrderClient = (ws, orderNumber, accessToken) => {
  const guestKey = buildGuestKey(orderNumber, accessToken);
  addClientToMap(guestOrderClients, guestKey, ws);
  clientState.set(ws, { kind: "guest", guestKey });

  sendJson(ws, {
    type: "connected",
    data: {
      orderNumber
    }
  });
};

const authenticateUserToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user || !user.isActive) {
    return null;
  }

  return user;
};

const validateGuestOrderAccess = async (orderNumber, accessToken) => {
  if (!orderNumber || !accessToken) {
    return false;
  }

  const order = await Order.findOne({ orderNumber }).select("+guestAccessToken");
  return !!order && order.guestAccessToken === accessToken;
};

export const initRealtimeServer = (server) => {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    try {
      const requestUrl = new URL(req.url || "/ws", "http://localhost");
      const token = requestUrl.searchParams.get("token") || "";
      const orderNumber = requestUrl.searchParams.get("orderNumber") || "";
      const accessToken = requestUrl.searchParams.get("accessToken") || "";

      if (token) {
        const user = await authenticateUserToken(token);
        if (!user) {
          sendJson(ws, { type: "error", message: "Unauthorized websocket connection" });
          ws.close();
          return;
        }

        connectUserClient(ws, user);
      } else if (await validateGuestOrderAccess(orderNumber, accessToken)) {
        connectGuestOrderClient(ws, orderNumber, accessToken);
      } else {
        sendJson(ws, { type: "error", message: "Missing websocket credentials" });
        ws.close();
        return;
      }

      ws.on("close", () => removeClient(ws));
      ws.on("error", () => removeClient(ws));
    } catch (error) {
      sendJson(ws, { type: "error", message: "Failed to initialize realtime connection" });
      ws.close();
    }
  });

  return wss;
};

const broadcastToClients = (clients, payload) => {
  if (!clients) {
    return;
  }

  clients.forEach((client) => sendJson(client, payload));
};

const broadcastToStaff = (type, order) => {
  const payload = { type, data: serializeOrder(order) };
  broadcastToClients(staffClients, payload);
};

const broadcastToCustomer = (type, order) => {
  if (order.customerUser) {
    const userId = String(order.customerUser?._id || order.customerUser);
    const clients = userClients.get(userId);
    broadcastToClients(clients, { type, data: serializeOrder(order) });
  }

  if (order.guestAccessToken && order.orderNumber) {
    const guestKey = buildGuestKey(order.orderNumber, order.guestAccessToken);
    const clients = guestOrderClients.get(guestKey);
    broadcastToClients(clients, {
      type,
      data: serializeOrder(order)
    });
  }
};

export const publishOrderCreated = (order) => {
  if (!wss) {
    return;
  }

  broadcastToStaff("order.created", order);
  broadcastToCustomer("order.created", order);
};

export const publishOrderUpdated = (order) => {
  if (!wss) {
    return;
  }

  broadcastToStaff("order.updated", order);
  broadcastToCustomer("order.updated", order);
};
