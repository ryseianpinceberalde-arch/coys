import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { resolveAssetUrl } from "../utils/api";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    name: "Coy's Corner",
    logoUrl: "",
    currency: "PHP",
    taxRate: 0,
    receiptFooter: "Thank you for your purchase!",
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get("/settings/public");
      setSettings({
        ...res.data,
        logoUrl: resolveAssetUrl(res.data.logoUrl),
      });
    } catch {
      // silently fail; defaults remain
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
