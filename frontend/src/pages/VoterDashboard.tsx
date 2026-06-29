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
            setError(err?.response?.data?.error || "Failed to load elections");
        } finally {
            setLoading(false);
        }
    };

    const loadElectionDetails = async (onchainId: number) => {
        try {
            setLoading(true);
            setError(null);
            setTxHash(null);
            setSelectedCandidateId(null);
            const res = await apiClient.get<ElectionDetail>(
                `/voter/elections/${onchainId}`
            );
            setElectionDetail(res.data);
            setSelectedElectionId(onchainId);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to load election details");
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async () => {
        if (selectedElectionId === null || selectedCandidateId === null || !electionDetail) return;
        const privateKey = window.localStorage.getItem("voter_private_key");
        if (!privateKey) {
            setError("No voter wallet key found locally. Please register or restore your wallet credentials.");
            return;
        }
        try {
            setLoading(true);
            setError(null);

            // 1) Construct EIP-191 packed hash locally
            const messageHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256", "address"],
                [selectedElectionId, selectedCandidateId, electionDetail.contractAddress]
            );

            // 2) Sign the hash locally using the voter's private key (0 gas!)
            const wallet = new ethers.Wallet(privateKey);
            const signature = await wallet.signMessage(ethers.getBytes(messageHash));

            // 3) Submit the signature to the backend relayer
            const res = await apiClient.post(
                `/voter/elections/${selectedElectionId}/vote`,
                {
                    candidateId: selectedCandidateId,
                    signature,
                }
            );

            setTxHash(res.data.txHash);
            setReceiptKey(res.data.receiptKey);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Failed to cast vote");
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

    return (
        <div className="container">
            <header className="header">
                <h1>Voter Dashboard</h1>
                <button className="btn" onClick={onLogout}>
                    Logout
                </button>
            </header>

            {error && <p className="error">{error}</p>}

            {!selectedElectionId ? (
                <div className="card">
                    <h2>Active Elections</h2>
                    {loading && <p>Loading elections...</p>}
                    {!loading && elections.length === 0 && (
                        <p>No active elections found.</p>
                    )}
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {elections.map((elec) => (
                            <li
                                key={elec.id}
                                style={{
                                    border: "1px solid #ddd",
                                    padding: "1rem",
                                    marginBottom: "1rem",
                                    borderRadius: "4px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div>
                                    <strong>{elec.name}</strong> (ID: {elec.onchainElectionId})
                                    <br />
                                    <small>
                                        Ends: {new Date(elec.endTime).toLocaleString()}
                                    </small>
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
                            setError(null);
                        }}
                        style={{ marginBottom: "1rem" }}
                    >
                        &larr; Back to Elections
                    </button>

                    {loading && <p>Loading details...</p>}

                    {electionDetail && (
                        <>
                            <h2>{electionDetail.name}</h2>
                            <p>State: {getElectionStateName(electionDetail.state)}</p>
                            <p>
                                Ends: {new Date(electionDetail.endTime * 1000).toLocaleString()}
                            </p>

                            <div style={{ marginTop: "1.5rem" }}>
                                <h3>Candidates</h3>
                                {electionDetail.candidates.map((cand) => (
                                    <div key={cand.id} style={{ marginBottom: "0.5rem" }}>
                                        <label style={{ display: "flex", alignItems: "center" }}>
                                            <input
                                                type="radio"
                                                name="candidate"
                                                value={cand.id}
                                                checked={selectedCandidateId === cand.id}
                                                onChange={() => setSelectedCandidateId(cand.id)}
                                                disabled={!!txHash || electionDetail.state !== 1} // Disable if already voted or not active
                                                style={{ marginRight: "0.5rem" }}
                                            />
                                            {cand.name} (ID: {cand.id})
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {txHash && (
                                <div
                                    className="success"
                                    style={{
                                        color: "green",
                                        marginTop: "1rem",
                                        padding: "1rem",
                                        border: "1px solid green",
                                        borderRadius: "4px",
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
                                        selectedCandidateId === null ||
                                        electionDetail.state !== 1
                                    }
                                    style={{ marginTop: "1rem" }}
                                >
                                    {loading ? "Voting..." : "Submit Vote"}
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
