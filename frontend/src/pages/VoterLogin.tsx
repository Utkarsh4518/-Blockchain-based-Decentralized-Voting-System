import React, { useState } from "react";
import { apiClient } from "../api/client";

interface Props {
    onLogin: (jwt: string) => void;
}

const VoterLogin: React.FC<Props> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"request" | "verify">("request");
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

    return (
        <div className="card" style={{ maxWidth: 400, margin: "2rem auto" }}>
            <h2>Voter Login</h2>
            {error && <p className="error">{error}</p>}
            {message && <p className="success" style={{ color: "green", marginBottom: "1rem" }}>{message}</p>}

            {step === "request" ? (
                <form onSubmit={handleRequestOtp}>
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
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp}>
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
                        onClick={() => setStep("request")}
                        style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}
                    >
                        Back
                    </button>
                </form>
            )}
        </div>
    );
};

export default VoterLogin;
