import React, { useState } from "react";

interface Props {
  onLogin: (token: string) => void;
}

const AdminLogin: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    onLogin(token.trim());
  };

  return (
    <div className="container">
      <h1>Admin Login</h1>
      <p className="muted">
        For now, paste a valid admin JWT here. The email field is informational
        only.
      </p>
      <form onSubmit={handleSubmit} className="card">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>
        <label className="field">
          <span>JWT Token</span>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste admin JWT here"
            rows={4}
          />
        </label>
        <button type="submit" className="btn primary">
          Login
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;

