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

    return (
        <div className="card" style={{ marginTop: "1rem" }}>
            <h2>Results Summary</h2>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
                <input
                    type="number"
                    placeholder="On-chain Election ID"
                    value={electionIdInput}
                    onChange={(e) => setElectionIdInput(e.target.value)}
                />
                <button className="btn primary" onClick={fetchResults} disabled={loading}>
                    {loading ? "Loading..." : "Get Results"}
                </button>
            </div>

            {error && <p className="error">{error}</p>}

            {election && (
                <div style={{ marginTop: "1rem" }}>
                    <h3 style={{ marginBottom: "0.5rem" }}>{election.name}</h3>
                    <p className="muted" style={{ marginBottom: "1rem" }}>
                        Status: <strong>{getElectionStateName(election.state)}</strong>
                        {" | "}
                        Total Votes: <strong>{totalVotes}</strong>
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {election.candidates.map((cand) => {
                            const percentage =
                                totalVotes > 0 ? (cand.voteCount / totalVotes) * 100 : 0;
                            return (
                                <div
                                    key={cand.id}
                                    style={{
                                        border: "1px solid #ddd",
                                        padding: "1rem",
                                        borderRadius: "4px",
                                        background: "#f9f9f9",
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
                                            {cand.voteCount} votes ({percentage.toFixed(2)}%)
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            width: "100%",
                                            background: "#e0e0e0",
                                            height: "8px",
                                            borderRadius: "4px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${percentage}%`,
                                                background: "#0070f3",
                                                height: "100%",
                                                transition: "width 0.3s ease",
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
