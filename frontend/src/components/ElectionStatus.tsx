import React, { useState } from "react";

interface Props {
  onFetch: (onchainElectionId: number) => Promise<any>;
}

const ElectionStatus: React.FC<Props> = ({ onFetch }) => {
  const [electionIdInput, setElectionIdInput] = useState("");
  const [status, setStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const id = Number(electionIdInput);
    if (Number.isNaN(id) || id <= 0) {
      setError("Please enter a valid election ID.");
      return;
    }
    setLoading(true);
    try {
      const data = await onFetch(id);
      setStatus(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load election.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Election Status</h2>
      <form onSubmit={handleFetch} className="field">
        <span>On-chain Election ID</span>
        <input
          type="number"
          value={electionIdInput}
          onChange={(e) => setElectionIdInput(e.target.value)}
          placeholder="1"
          min={1}
        />
        <button type="submit" className="btn secondary" disabled={loading}>
          {loading ? "Loading..." : "Load Election"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {status && (
        <div className="status">
          <p>
            <strong>Name:</strong> {status.name}
          </p>
          <p>
            <strong>State:</strong> {status.state}
          </p>
          <p>
            <strong>Start:</strong>{" "}
            {new Date(status.startTime * 1000).toLocaleString()}
          </p>
          <p>
            <strong>End:</strong>{" "}
            {new Date(status.endTime * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Total Votes:</strong> {status.totalVotes}
          </p>
          <p>
            <strong>Candidate IDs:</strong>{" "}
            {Array.isArray(status.candidateIds)
              ? status.candidateIds.join(", ")
              : ""}
          </p>
        </div>
      )}
    </div>
  );
};

export default ElectionStatus;

