import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import api from "../utils/api";

const ProfilePage = () => {
  const { user, token } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return;
    await api.put(`/users/${user.id}`, { name, email }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
    alert("Profile update simulated on admin API (for demo).");
  };

  return (
    <Layout>
      <h1>Profile</h1>
      <form className="card" onSubmit={submit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="primary">
          Update (Demo)
        </button>
      </form>
    </Layout>
  );
};

export default ProfilePage;

