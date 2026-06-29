import React, { useEffect, useState } from "react";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import VoterLogin from "./pages/VoterLogin";
import VoterDashboard from "./pages/VoterDashboard";
import ReceiptVerifier from "./pages/ReceiptVerifier";
import BlockExplorer from "./pages/BlockExplorer";

type AppMode = "landing" | "admin" | "voter" | "verifier" | "explorer";

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>("landing");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [voterToken, setVoterToken] = useState<string | null>(null);

  useEffect(() => {
    const storedAdmin = window.localStorage.getItem("admin_jwt");
    if (storedAdmin) setAdminToken(storedAdmin);

    const storedVoter = window.localStorage.getItem("voter_jwt");
    if (storedVoter) setVoterToken(storedVoter);
  }, []);

  const handleAdminLogin = (jwt: string) => {
    setAdminToken(jwt);
    window.localStorage.setItem("admin_jwt", jwt);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    window.localStorage.removeItem("admin_jwt");
    setMode("landing");
  };

  const handleVoterLogin = (jwt: string) => {
    setVoterToken(jwt);
    window.localStorage.setItem("voter_jwt", jwt);
  };

  const handleVoterLogout = () => {
    setVoterToken(null);
    window.localStorage.removeItem("voter_jwt");
    setMode("landing");
  };

  if (mode === "landing") {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "8vh" }}>
        <h1>Blockchain Voting System</h1>
        <p>Please select your portal</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem", maxWidth: "340px", margin: "2rem auto" }}>
          <button className="btn primary" onClick={() => setMode("voter")} style={{ padding: "0.8rem" }}>
            Voter Portal
          </button>
          <button className="btn" onClick={() => setMode("admin")} style={{ padding: "0.8rem" }}>
            Admin Portal
          </button>
          <button className="btn secondary" style={{ background: "#6b7280", color: "white", padding: "0.8rem" }} onClick={() => setMode("verifier")}>
            Ballot Verifier (E2E-V)
          </button>
          <button className="btn secondary" style={{ background: "#0f172a", color: "white", padding: "0.8rem" }} onClick={() => setMode("explorer")}>
            On-Chain Block Explorer
          </button>
        </div>
      </div>
    );
  }

  if (mode === "admin") {
    if (!adminToken) {
      return (
        <>
          <button className="btn" onClick={() => setMode("landing")} style={{ margin: "1rem" }}>
            &larr; Back to Landing
          </button>
          <AdminLogin onLogin={handleAdminLogin} />
        </>
      );
    }
    return <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />;
  }

  if (mode === "voter") {
    if (!voterToken) {
      return (
        <>
          <button className="btn" onClick={() => setMode("landing")} style={{ margin: "1rem" }}>
            &larr; Back to Landing
          </button>
          <VoterLogin onLogin={handleVoterLogin} />
        </>
      );
    }
    return <VoterDashboard token={voterToken} onLogout={handleVoterLogout} />;
  }

  if (mode === "verifier") {
    return <ReceiptVerifier onBack={() => setMode("landing")} />;
  }

  if (mode === "explorer") {
    return <BlockExplorer onBack={() => setMode("landing")} />;
  }

  return null;
};

export default App;
