import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface Transaction {
  txHash: string;
  blockNumber: number;
  eventName: string;
  eventData: any;
  createdAt: string;
}

interface Props {
  onBack: () => void;
}

const BlockExplorer: React.FC<Props> = ({ onBack }) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<Transaction[]>("/admin/audit-log");
      setTxs(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load audit transactions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 950, margin: "2rem auto" }}>
      <button className="btn" onClick={onBack} style={{ marginBottom: "1.5rem" }}>
        &larr; Back to Landing
      </button>

      <div className="grid" style={{ gridTemplateColumns: selectedTx ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>On-Chain Event Ledger (Audit Log)</h2>
            <button className="btn" onClick={fetchAuditLog} disabled={loading} style={{ padding: "0.3rem 0.8rem" }}>
              {loading ? "Syncing..." : "Refresh Ledger"}
            </button>
          </div>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>
            This page audits all indexed events recorded on the blockchain network. Click any transaction row to view its structured parameters.
          </p>

          {error && <p className="error" style={{ marginBottom: "1rem" }}>{error}</p>}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd", color: "#666" }}>
                  <th style={{ padding: "0.8rem 0.5rem" }}>Block #</th>
                  <th style={{ padding: "0.8rem 0.5rem" }}>Event Type</th>
                  <th style={{ padding: "0.8rem 0.5rem" }}>Transaction Hash</th>
                  <th style={{ padding: "0.8rem 0.5rem" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr
                    key={tx.txHash}
                    onClick={() => setSelectedTx(tx)}
                    style={{
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      backgroundColor: selectedTx?.txHash === tx.txHash ? "#eef6ff" : "transparent",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTx?.txHash !== tx.txHash) {
                        e.currentTarget.style.backgroundColor = "#f9f9f9";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTx?.txHash !== tx.txHash) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <td style={{ padding: "0.8rem 0.5rem", fontWeight: "bold" }}>#{tx.blockNumber}</td>
                    <td style={{ padding: "0.8rem 0.5rem" }}>
                      <span
                        style={{
                          backgroundColor:
                            tx.eventName === "VoteCast"
                              ? "#e6f7ff"
                              : tx.eventName === "VoterRegistered"
                              ? "#f6ffed"
                              : tx.eventName === "ElectionCreated"
                              ? "#fff7e6"
                              : "#fff0f6",
                          color:
                            tx.eventName === "VoteCast"
                              ? "#1890ff"
                              : tx.eventName === "VoterRegistered"
                              ? "#52c41a"
                              : tx.eventName === "ElectionCreated"
                              ? "#fa8c16"
                              : "#eb2f96",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                        }}
                      >
                        {tx.eventName}
                      </span>
                    </td>
                    <td style={{ padding: "0.8rem 0.5rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#555" }}>
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </td>
                    <td style={{ padding: "0.8rem 0.5rem", fontSize: "0.85rem", color: "#888" }}>
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTx && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>Transaction Details</h3>
              <button
                className="btn"
                onClick={() => setSelectedTx(null)}
                style={{ padding: "0.1rem 0.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#888" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
              <div>
                <strong className="muted" style={{ display: "block" }}>Transaction Hash</strong>
                <code style={{ wordBreak: "break-all", background: "#f5f5f5", padding: "0.3rem", borderRadius: "4px", display: "block", marginTop: "0.2rem" }}>
                  {selectedTx.txHash}
                </code>
              </div>

              <div>
                <strong className="muted" style={{ display: "block" }}>Block Number</strong>
                <span>Block #{selectedTx.blockNumber}</span>
              </div>

              <div>
                <strong className="muted" style={{ display: "block" }}>Event Type</strong>
                <span>{selectedTx.eventName}</span>
              </div>

              <div>
                <strong className="muted" style={{ display: "block" }}>Timestamp</strong>
                <span>{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>

              <div>
                <strong className="muted" style={{ display: "block" }}>Event Data (Decoded Parameters)</strong>
                <pre
                  style={{
                    backgroundColor: "#272822",
                    color: "#f8f8f2",
                    padding: "1rem",
                    borderRadius: "6px",
                    overflowX: "auto",
                    marginTop: "0.3rem",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                  }}
                >
                  {JSON.stringify(selectedTx.eventData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockExplorer;
