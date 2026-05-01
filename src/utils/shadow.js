import { Platform } from "react-native";

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((char) => `${char}${char}`).join("") : value;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const toCssShadow = ({ color, opacity, radius, offsetY }) => {
  const { r, g, b } = hexToRgb(color);
  return `0px ${offsetY}px ${radius * 2}px rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const createShadow = ({
  color = "#000000",
  opacity = 0.04,
  radius = 6,
  offsetY = 1,
  elevation = 2,
} = {}) =>
  Platform.select({
    web: {
      boxShadow: toCssShadow({ color, opacity, radius, offsetY }),
    },
    default: {
      elevation,
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
  });
