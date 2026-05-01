import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export const resolveAssetUrl = (value) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (typeof window === "undefined") {
    return value;
  }

  return new URL(value, `${window.location.origin}/`).toString();
};

const getDownloadFilename = (contentDisposition, fallbackName = "download") => {
  const value = String(contentDisposition || "");
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = value.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallbackName;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const downloadAuthenticatedFile = async (url, fallbackName = "download") => {
  const response = await api.get(url, { responseType: "blob" });
  const filename = getDownloadFilename(response.headers["content-disposition"], fallbackName);
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export default api;
