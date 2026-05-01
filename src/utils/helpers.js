import { CURRENCY } from "../constants/data";

export const fmt = (n) => `${CURRENCY}${Number(n || 0).toFixed(2)}`;

export const formatTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const isValidPhone = (p) => /^09\d{9}$/.test(p.replace(/[\s-]/g, ""));

export const getDateList = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push({
      key: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en", { weekday: "short" }),
      date: d.getDate(),
      month: d.toLocaleDateString("en", { month: "short" }),
      full: d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }),
    });
  }
  return dates;
};
