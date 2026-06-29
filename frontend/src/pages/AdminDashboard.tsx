import React, { useEffect, useState } from "react";
import ElectionForm from "../components/ElectionForm";
import ElectionStatus from "../components/ElectionStatus";
import ResultsPanel from "../components/ResultsPanel";
import { apiClient, setAuthToken } from "../api/client";

interface Props {
  token: string;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ token, onLogout }) => {
  const [lastCreatedElectionId, setLastCreatedElectionId] = useState<
    number | null
  >(null);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const handleCreateElection = async (payload: {
    name: string;
    startTime: number;
    endTime: number;
    candidates: { id: number; name: string }[];
  }) => {
    const response = await apiClient.post("/admin/elections", {
      name: payload.name,
      startTime: payload.startTime,
      endTime: payload.endTime,
      candidates: payload.candidates.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    });
    const { onchainElectionId } = response.data;
    setLastCreatedElectionId(onchainElectionId);
  };

  const handleStartElection = async () => {
    if (!lastCreatedElectionId) {
      setStartError("No election ID available. Create an election first.");
      return;
    }
    setStartError(null);
    setStartLoading(true);
    try {
      await apiClient.post(
        `/admin/elections/${lastCreatedElectionId}/start`
      );
    } catch (err: any) {
      setStartError(err?.message ?? "Failed to start election.");
    } finally {
      setStartLoading(false);
    }
  };

  const fetchElectionStatus = async (onchainId: number) => {
    const response = await apiClient.get(`/voter/elections/${onchainId}`);
    return response.data;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Admin Dashboard</h1>
        <button className="btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="grid">
        <div>
          <ElectionForm onCreate={handleCreateElection} />

          <div className="card">
            <h2>Start Election</h2>
            <p className="muted">
              Last created on-chain election ID:{" "}
              {lastCreatedElectionId ?? "none yet"}
            </p>
            {startError && <p className="error">{startError}</p>}
            <button
              type="button"
              className="btn primary"
              onClick={handleStartElection}
              disabled={startLoading || !lastCreatedElectionId}
            >
              {startLoading ? "Starting..." : "Start Last Election"}
            </button>
          </div>
        </div>

        <div>
          <ElectionStatus onFetch={fetchElectionStatus} />
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

