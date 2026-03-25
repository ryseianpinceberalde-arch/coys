import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch {
        setToken(null);
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem("token", jwt);
  };

  const login = async (email, password) => {
    // Clear any stale token before logging in
    localStorage.removeItem("token");
    const res = await api.post("/auth/login", { email, password });
    const { token: jwt, user: userData } = res.data;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem("token", jwt);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

