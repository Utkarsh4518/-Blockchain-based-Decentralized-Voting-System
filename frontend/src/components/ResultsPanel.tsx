import React, { useState } from "react";
import { apiClient } from "../api/client";

interface Candidate {
    id: number;
    name: string;
    voteCount: number;
}

interface ElectionDetail {
    id: number;
    name: string;
    startTime: number;
    endTime: number;
    state: number;
    candidates: Candidate[];
}

const ResultsPanel: React.FC = () => {
    const [electionIdInput, setElectionIdInput] = useState("");
    const [election, setElection] = useState<ElectionDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchResults = async () => {
        if (!electionIdInput) return;
        setLoading(true);
        setError(null);
        setElection(null);
        try {
            const res = await apiClient.get<ElectionDetail>(
                `/voter/elections/${electionIdInput}`
            );
            setElection(res.data);
        } catch (err: any) {
            setError(
                err?.response?.data?.error || "Failed to fetch election results."
            );
        } finally {
            setLoading(false);
        }
    };

    const getElectionStateName = (state: number) => {
        switch (state) {
            case 0:
                return "CREATED";
            case 1:
                return "ACTIVE";
            case 2:
                return "ENDED";
            default:
                return "UNKNOWN";
        }
    };

    const totalVotes =
        election?.candidates.reduce((sum, c) => sum + c.voteCount, 0) || 0;

    // Segment colors for SVG Chart
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

    let cumulativePercent = 0;
    const segments = election
        ? election.candidates.map((cand, idx) => {
              const percentage = totalVotes > 0 ? (cand.voteCount / totalVotes) * 100 : 0;
              const offset = 100 - cumulativePercent;
              cumulativePercent += percentage;
              return {
                  percentage,
                  offset,
                  color: colors[idx % colors.length],
                  name: cand.name,
                  votes: cand.voteCount,
              };
          })
        : [];

    return (
        <div className="card" style={{ marginTop: "1rem" }}>
            <h2>Visual Results Dashboard</h2>
            <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
                <input
                    type="number"
                    placeholder="On-chain Election ID"
                    value={electionIdInput}
                    onChange={(e) => setElectionIdInput(e.target.value)}
                    style={{ flex: 1, padding: "0.5rem" }}
                />
                <button className="btn primary" onClick={fetchResults} disabled={loading}>
                    {loading ? "Loading..." : "Get Results"}
                </button>
            </div>

            {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

            {election && (
                <div style={{ marginTop: "1rem" }}>
                    <h3 style={{ marginBottom: "0.3rem" }}>{election.name}</h3>
                    <p className="muted" style={{ marginBottom: "1.5rem" }}>
                        Status: <span style={{ color: election.state === 1 ? "green" : "red", fontWeight: "bold" }}>{getElectionStateName(election.state)}</span>
                        {" | "}
                        Total Votes Cast: <strong>{totalVotes}</strong>
                    </p>

                    {/* SVG Doughnut Chart */}
                    {totalVotes > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                margin: "2rem 0",
                                gap: "2rem",
                                flexWrap: "wrap",
                                padding: "1rem",
                                backgroundColor: "#fafafa",
                                borderRadius: "8px",
                                border: "1px solid #eee",
                            }}
                        >
                            <svg width="140" height="140" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                {segments.map((seg, idx) => (
                                    <circle
                                        key={idx}
                                        cx="18"
                                        cy="18"
                                        r="15.915"
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="4.2"
                                        strokeDasharray={`${seg.percentage} ${100 - seg.percentage}`}
                                        strokeDashoffset={seg.offset}
                                        style={{
                                            transition: "stroke-dashoffset 0.8s ease, stroke-width 0.2s ease",
                                        }}
                                    />
                                ))}
                            </svg>
                            {/* Chart Legend */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", textAlign: "left" }}>
                                {segments.map((seg, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: seg.color }} />
                                        <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                                            {seg.name}: <strong>{seg.votes}</strong> ({seg.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p style={{ textAlign: "center", padding: "1.5rem", background: "#f9f9f9", borderRadius: "6px", color: "#666" }}>
                            No votes have been cast in this election yet.
                        </p>
                    )}

                    {/* Horizontal Progress Bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
                        {election.candidates.map((cand, idx) => {
                            const percentage = totalVotes > 0 ? (cand.voteCount / totalVotes) * 100 : 0;
                            const barColor = colors[idx % colors.length];
                            return (
                                <div
                                    key={cand.id}
                                    style={{
                                        border: "1px solid #eee",
                                        padding: "1rem",
                                        borderRadius: "6px",
                                        background: "#ffffff",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        <strong>
                                            {cand.name} (ID: {cand.id})
                                        </strong>
                                        <span>
                                            <strong>{cand.voteCount}</strong> votes ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            width: "100%",
                                            background: "#f0f0f0",
                                            height: "10px",
                                            borderRadius: "5px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${percentage}%`,
                                                background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}cc 100%)`,
                                                height: "100%",
                                                transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsPanel;
