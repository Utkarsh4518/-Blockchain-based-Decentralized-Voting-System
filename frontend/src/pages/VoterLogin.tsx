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
      await apiClient.post("/auth/otp/request", { email });
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
      const response = await apiClient.post("/auth/otp/verify", { email, otp });
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
      // 1. Generate standard Web Crypto ECDSA keypair locally
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["sign", "verify"]
      );

      const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
      const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const publicKeyString = JSON.stringify(publicKeyJwk);

      // 2. Submit email and public key to backend registration Relayer
      const res = await apiClient.post("/auth/register", {
        email,
        publicKey: publicKeyString,
      });

      const { wallet } = res.data;

      // 3. Store the generated Web3 wallet and Web Crypto private key locally
      window.localStorage.setItem("voter_private_key", wallet.privateKey);
      window.localStorage.setItem("voter_wallet_address", wallet.address);
      window.localStorage.setItem("voter_passkey_private", JSON.stringify(privateKeyJwk));
      window.localStorage.setItem("voter_passkey_public", publicKeyString);

      setMessage(
        `Registration successful! Wallet ${wallet.address} authorized on-chain.\n` +
        `Cryptographic passkeys generated and stored securely in this browser.\n` +
        `Please log in using OTP or Passkey.`
      );
      setStep("request");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to register voter");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError("Please enter your email to login with Passkey.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      // 1. Get verification challenge from server
      const challengeRes = await apiClient.post("/auth/passkey/challenge", { email });
      const { challenge } = challengeRes.data;

      // 2. Import locally stored private key for signing
      const privateKeyJwkStr = window.localStorage.getItem("voter_passkey_private");
      if (!privateKeyJwkStr) {
        throw new Error("No passkey credentials found on this browser for this email. Please register first.");
      }
      const privateKeyJwk = JSON.parse(privateKeyJwkStr);

      const privateKeyObj = await window.crypto.subtle.importKey(
        "jwk",
        privateKeyJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      );

      // 3. Cryptographically sign the server challenge offline
      const encoder = new TextEncoder();
      const challengeBytes = encoder.encode(challenge);
      const signatureArrayBuffer = await window.crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privateKeyObj,
        challengeBytes
      );

      // 4. Convert signature buffer to hex
      const signatureHex = Array.from(new Uint8Array(signatureArrayBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // 5. Submit email and signature to verification endpoint
      const response = await apiClient.post("/auth/passkey/verify", {
        email,
        signature: signatureHex,
      });

      const { accessToken } = response.data;
      onLogin(accessToken);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to log in with Passkey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 460, margin: "2rem auto" }}>
      <h2>Voter Portal</h2>
      {error && <p className="error" style={{ whiteSpace: "pre-line" }}>{error}</p>}
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Requesting..." : "Send OTP"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handlePasskeyLogin}
              disabled={loading}
              style={{ flex: 1, backgroundColor: "#0f172a", color: "white" }}
            >
              🔑 Login with Passkey
            </button>
          </div>
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
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Registering authorizes a secure random on-chain wallet for your account, funds it gaslessly via our Relayer, and creates a secure biometric-standard Web Crypto Passkey locally in this browser.
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
          <button type="submit" className="btn primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Registering..." : "Register Passkey & Wallet"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStep("request");
              setError(null);
              setMessage(null);
            }}
            style={{ marginTop: "0.5rem", width: "100%" }}
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
};

export default VoterLogin;
