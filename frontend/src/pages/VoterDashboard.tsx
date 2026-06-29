import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { apiClient, setAuthToken } from "../api/client";

interface Props {
    token: string;
    onLogout: () => void;
}

interface Election {
    id: string;
    onchainElectionId: number;
    name: string;
    startTime: string;
    endTime: string;
    status: string;
}

interface ElectionDetail {
    id: number;
    name: string;
    startTime: number;
    endTime: number;
    state: number;
    contractAddress: string;
    isQuadratic: boolean;
    voterBudget: number;
    candidates: {
        id: number;
        name: string;
        voteCount: number;
    }[];
}

const VoterDashboard: React.FC<Props> = ({ token, onLogout }) => {
    const [elections, setElections] = useState<Election[]>([]);
    const [selectedElectionId, setSelectedElectionId] = useState<number | null>(
        null
    );
    const [electionDetail, setElectionDetail] = useState<ElectionDetail | null>(
        null
    );
    const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
        null
    );
    const [quadraticWeights, setQuadraticWeights] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [receiptKey, setReceiptKey] = useState<string | null>(null);

    useEffect(() => {
        setAuthToken(token);
        fetchElections();
    }, [token]);

    const fetchElections = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get<Election[]>("/voter/elections");
            setElections(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load elections list");
        } finally {
            setLoading(false);
        }
    };

    const loadElectionDetails = async (onchainId: number) => {
        try {
            setLoading(true);
            setError(null);
            setTxHash(null);
            setReceiptKey(null);
            setSelectedCandidateId(null);
            setQuadraticWeights({});
            setSelectedElectionId(onchainId);

            const res = await apiClient.get<ElectionDetail>(
                `/voter/elections/${onchainId}`
            );
            setElectionDetail(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load election details");
        } finally {
            setLoading(false);
        }
    };

    const handleWeightChange = (candidateId: number, delta: number) => {
        setQuadraticWeights((prev) => {
            const current = prev[candidateId] || 0;
            const next = Math.max(0, current + delta);
            return {
                ...prev,
                [candidateId]: next,
            };
        });
    };

    const handleVote = async () => {
        if (selectedElectionId === null || !electionDetail) return;
        const privateKey = window.localStorage.getItem("voter_private_key");
        if (!privateKey) {
            setError("No voter wallet key found locally. Please register or restore your wallet credentials.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const wallet = new ethers.Wallet(privateKey);
            let res;

            if (electionDetail.isQuadratic) {
                // Prepare arrays
                const candidateIdsArray = electionDetail.candidates.map(c => c.id);
                const weightsArray = electionDetail.candidates.map(c => quadraticWeights[c.id] || 0);

                // Check budget
                const totalCost = weightsArray.reduce((sum, w) => sum + w * w, 0);
                if (totalCost > electionDetail.voterBudget) {
                    throw new Error(`Exceeded voting budget of ${electionDetail.voterBudget} credits.`);
                }
                if (totalCost === 0) {
                    throw new Error("Please allocate at least one vote credit.");
                }

                // Construct and sign EIP-191 packed hash locally
                const messageHash = ethers.solidityPackedKeccak256(
                    ["uint256", "uint256[]", "uint256[]", "address"],
                    [selectedElectionId, candidateIdsArray, weightsArray, electionDetail.contractAddress]
                );

                const signature = await wallet.signMessage(ethers.getBytes(messageHash));

                res = await apiClient.post(
                    `/voter/elections/${selectedElectionId}/vote`,
                    {
                        candidateIds: candidateIdsArray,
                        weights: weightsArray,
                        signature,
                    }
                );
            } else {
                if (selectedCandidateId === null) {
                    throw new Error("Please select a candidate.");
                }

                // Standard signature
                const messageHash = ethers.solidityPackedKeccak256(
                    ["uint256", "uint256", "address"],
                    [selectedElectionId, selectedCandidateId, electionDetail.contractAddress]
                );

                const signature = await wallet.signMessage(ethers.getBytes(messageHash));

                res = await apiClient.post(
                    `/voter/elections/${selectedElectionId}/vote`,
                    {
                        candidateId: selectedCandidateId,
                        signature,
                    }
                );
            }

            setTxHash(res.data.txHash);
            setReceiptKey(res.data.receiptKey);
        } catch (err: any) {
            setError(err?.response?.data?.error || err.message || "Failed to cast vote");
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

    // Calculate budget for quadratic voting UI
    const usedCredits = electionDetail && electionDetail.isQuadratic
        ? electionDetail.candidates.reduce(
              (sum, c) => sum + (quadraticWeights[c.id] || 0) * (quadraticWeights[c.id] || 0),
              0
          )
        : 0;

    const remainingCredits = electionDetail ? electionDetail.voterBudget - usedCredits : 0;

    return (
        <div className="container" style={{ maxWidth: 700, margin: "2rem auto" }}>
            <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1>Voter Dashboard</h1>
                <button className="btn" onClick={onLogout}>
                    Logout
                </button>
            </header>

            {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

            {selectedElectionId === null ? (
                <div className="card">
                    <h2>Active Elections</h2>
                    {loading && <p>Loading elections...</p>}
                    <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
                        {elections.map((elec) => (
                            <li
                                key={elec.id}
                                style={{
                                    borderBottom: "1px solid #eee",
                                    padding: "1rem 0",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div>
                                    <strong>{elec.name}</strong>
                                    <p className="muted" style={{ fontSize: "0.85rem" }}>
                                        On-chain ID: {elec.onchainElectionId}
                                    </p>
                                </div>
                                <button
                                    className="btn primary"
                                    onClick={() => loadElectionDetails(elec.onchainElectionId)}
                                >
                                    View Details
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="card">
                    <button
                        className="btn"
                        onClick={() => {
                            setSelectedElectionId(null);
                            setElectionDetail(null);
                            setTxHash(null);
                            setReceiptKey(null);
                            setError(null);
                        }}
                        style={{ marginBottom: "1.5rem" }}
                    >
                        &larr; Back to Elections
                    </button>

                    {loading && <p>Loading details...</p>}

                    {electionDetail && (
                        <>
                            <h2>{electionDetail.name}</h2>
                            <p className="muted" style={{ marginBottom: "1.5rem" }}>
                                Status: <strong style={{ color: electionDetail.state === 1 ? "green" : "red" }}>{getElectionStateName(electionDetail.state)}</strong>
                                {" | "}
                                Mode: <strong>{electionDetail.isQuadratic ? "Quadratic Voting" : "Standard Voting"}</strong>
                            </p>

                            {electionDetail.isQuadratic && (
                                <div
                                    style={{
                                        background: remainingCredits >= 0 ? "#eef6ff" : "#fff1f0",
                                        padding: "1rem",
                                        borderRadius: "6px",
                                        border: `1px solid ${remainingCredits >= 0 ? "#bae7ff" : "#ffccc7"}`,
                                        marginBottom: "1.5rem",
                                    }}
                                >
                                    <strong>Quadratic Voting Budget:</strong>
                                    <br />
                                    Spent Credits: <strong>{usedCredits}</strong> / {electionDetail.voterBudget}
                                    <br />
                                    Remaining Credits: <strong style={{ color: remainingCredits >= 0 ? "green" : "red" }}>{remainingCredits}</strong>
                                </div>
                            )}

                            <div style={{ marginTop: "1.5rem" }}>
                                <h3>Candidates</h3>
                                {electionDetail.candidates.map((cand) => (
                                    <div
                                        key={cand.id}
                                        style={{
                                            padding: "0.8rem",
                                            border: "1px solid #eee",
                                            borderRadius: "6px",
                                            marginBottom: "0.5rem",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            backgroundColor: "#fafafa",
                                        }}
                                    >
                                        <div>
                                            <strong>{cand.name}</strong> (ID: {cand.id})
                                        </div>

                                        {electionDetail.isQuadratic ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => handleWeightChange(cand.id, -1)}
                                                    disabled={!!txHash || electionDetail.state !== 1 || !(quadraticWeights[cand.id] > 0)}
                                                    style={{ padding: "0.2rem 0.6rem" }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ fontSize: "1.1rem", fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>
                                                    {quadraticWeights[cand.id] || 0}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => handleWeightChange(cand.id, 1)}
                                                    disabled={!!txHash || electionDetail.state !== 1 || remainingCredits <= 0}
                                                    style={{ padding: "0.2rem 0.6rem" }}
                                                >
                                                    +
                                                </button>
                                                <span style={{ fontSize: "0.8rem", color: "#888", marginLeft: "0.5rem" }}>
                                                    ({(quadraticWeights[cand.id] || 0) * (quadraticWeights[cand.id] || 0)} credits)
                                                </span>
                                            </div>
                                        ) : (
                                            <label style={{ display: "flex", alignItems: "center" }}>
                                                <input
                                                    type="radio"
                                                    name="candidate"
                                                    value={cand.id}
                                                    checked={selectedCandidateId === cand.id}
                                                    onChange={() => setSelectedCandidateId(cand.id)}
                                                    disabled={!!txHash || electionDetail.state !== 1}
                                                    style={{ marginRight: "0.5rem" }}
                                                />
                                                Select
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {txHash && (
                                <div
                                    className="success"
                                    style={{
                                        color: "green",
                                        marginTop: "1.5rem",
                                        padding: "1.2rem",
                                        border: "1px solid green",
                                        borderRadius: "6px",
                                        backgroundColor: "#f6fff6",
                                    }}
                                >
                                    <strong>Vote successfully cast!</strong>
                                    <br />
                                    <br />
                                    <strong>Cryptographic Ballot Receipt (E2E-V):</strong>
                                    <br />
                                    <code style={{ wordBreak: "break-all", backgroundColor: "#e2f2e2", padding: "0.2rem 0.5rem", borderRadius: "4px", display: "inline-block", marginTop: "0.2rem", color: "#1e5a1e" }}>
                                        {receiptKey}
                                    </code>
                                    <br />
                                    <br />
                                    Transaction Hash:
                                    <br />
                                    <code style={{ wordBreak: "break-all" }}>{txHash}</code>
                                </div>
                            )}

                            {!txHash && (
                                <button
                                    className="btn primary"
                                    onClick={handleVote}
                                    disabled={
                                        loading ||
                                        electionDetail.state !== 1 ||
                                        (electionDetail.isQuadratic ? usedCredits === 0 || remainingCredits < 0 : selectedCandidateId === null)
                                    }
                                    style={{ marginTop: "1.5rem", width: "100%" }}
                                >
                                    {loading ? "Submitting Signature..." : "Submit Secure Vote"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoterDashboard;
