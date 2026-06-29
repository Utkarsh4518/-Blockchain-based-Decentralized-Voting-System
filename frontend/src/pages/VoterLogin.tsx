import React, { useState } from "react";
import { apiClient } from "../api/client";

interface Props {
  onLogin: (jwt: string) => void;
}

const VoterLogin: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "register">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient.post("/auth/request-otp", { email });
      setStep("verify");
      setMessage(`OTP sent to ${email} (check backend console)`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/verify-otp", { email, otp });
      const { accessToken } = response.data;
      onLogin(accessToken);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiClient.post("/auth/register", { email });
      const { wallet } = res.data;
      
      // Store the generated on-chain wallet credentials locally in the browser
      // This fulfills Requirement 6 & 7 (Providing a funded wallet for voting)
      window.localStorage.setItem("voter_private_key", wallet.privateKey);
      window.localStorage.setItem("voter_wallet_address", wallet.address);

      setMessage(
        `Registration successful! Wallet ${wallet.address} created and funded with 1.0 ETH. You can now log in.`
      );
      setStep("request");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to register voter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 450, margin: "2rem auto" }}>
      <h2>Voter Portal</h2>
      {error && <p className="error">{error}</p>}
      {message && (
        <p className="success" style={{ color: "green", marginBottom: "1rem", whiteSpace: "pre-line" }}>
          {message}
        </p>
      )}

      {step === "request" && (
        <form onSubmit={handleRequestOtp}>
          <h3>Login</h3>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voter@example.com"
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Requesting..." : "Send OTP"}
          </button>
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <span className="muted">Don't have a wallet yet? </span>
            <button
              type="button"
              className="btn small secondary"
              onClick={() => {
                setStep("register");
                setError(null);
                setMessage(null);
              }}
            >
              Register & Get Wallet
            </button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyOtp}>
          <h3>Verify OTP</h3>
          <div className="form-group">
            <label>OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Verifying..." : "Login"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStep("request");
              setError(null);
              setMessage(null);
            }}
            style={{ marginTop: "0.5rem", marginLeft: "0.5rem" }}
          >
            Back
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={handleRegister}>
          <h3>Register New Voter</h3>
          <p className="muted">
            Registering will generate a secure private Ethereum wallet, fund it with 1.0 ETH
            for transaction gas, and store it locally on this device.
          </p>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new_voter@example.com"
              required
            />
          </div>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Registering..." : "Register & Fund Wallet"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStep("request");
              setError(null);
              setMessage(null);
            }}
            style={{ marginTop: "0.5rem", marginLeft: "0.5rem" }}
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
};

export default VoterLogin;
