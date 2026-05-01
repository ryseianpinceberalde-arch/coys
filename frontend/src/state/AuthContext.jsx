import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const applyAuth = (payload) => {
    const { token: jwt, user: userData } = payload;
    setToken(jwt);
    setUser(userData);
    localStorage.setItem("token", jwt);
    return userData;
  };

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

  const requestRegistrationOtp = async (name, email, password) => {
    const res = await api.post("/auth/register/request-otp", { name, email, password });
    return res.data;
  };

  const register = async (name, email, password, otp) => {
    const res = await api.post("/auth/register", { name, email, password, otp });
    return applyAuth(res.data);
  };

  const login = async (email, password) => {
    // Clear any stale token before logging in
    localStorage.removeItem("token");
    const res = await api.post("/auth/login", { email, password });
    return applyAuth(res.data);
  };

  const loginWithGoogle = async (credential) => {
    localStorage.removeItem("token");
    const res = await api.post("/auth/google", { credential });
    return applyAuth(res.data);
  };

  const loginWithFacebook = async (accessToken) => {
    localStorage.removeItem("token");
    const res = await api.post("/auth/facebook", { accessToken });
    return applyAuth(res.data);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, requestRegistrationOtp, register, login, loginWithGoogle, loginWithFacebook, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

