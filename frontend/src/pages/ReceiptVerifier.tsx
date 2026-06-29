import React, { useState } from "react";
import { ethers } from "ethers";

interface Props {
  onBack: () => void;
}

const ReceiptVerifier: React.FC<Props> = ({ onBack }) => {
  const [receipt, setReceipt] = useState("");
  const [userId, setUserId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      if (!receipt.trim() || !userId.trim() || !candidateId.trim() || !txHash.trim()) {
        throw new Error("All fields are required.");
      }

      // 1. Calculate local SHA-256 hash using ethers.sha256
      const encoder = new TextEncoder();
      const inputStr = `${userId.trim()}-${candidateId.trim()}-${txHash.trim()}`;
      const inputBytes = encoder.encode(inputStr);
      const computedReceipt = ethers.sha256(inputBytes);

      // Remove leading '0x' if present for comparison
      const formattedComputed = computedReceipt.startsWith("0x") ? computedReceipt.slice(2) : computedReceipt;
      const formattedReceipt = receipt.trim().startsWith("0x") ? receipt.trim().slice(2) : receipt.trim();

      if (formattedComputed.toLowerCase() !== formattedReceipt.toLowerCase()) {
        throw new Error("Cryptographic verification failed:\nComputed Hash does not match the receipt key.\nParameters may have been tampered with or are incorrect.");
      }

      // 2. Fetch transaction from blockchain to verify it exists and was executed successfully
      const rpcUrl = "http://localhost:8545"; // Local Ganache node RPC
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const tx = await provider.getTransaction(txHash.trim());
      if (!tx) {
        throw new Error(`Transaction ${txHash} not found on the blockchain ledger.`);
      }

      const receiptTx = await provider.getTransactionReceipt(txHash.trim());
      if (!receiptTx) {
        throw new Error("Transaction is still pending on-chain.");
      }

      if (Number(receiptTx.status) !== 1) {
        throw new Error("Transaction execution failed on-chain.");
      }

      setVerificationResult(
        `✓ SUCCESS! Vote verified on-chain at block #${receiptTx.blockNumber}.\n\n` +
        `Audit Details:\n` +
        `- Signer Wallet: ${tx.from}\n` +
        `- Gas Used: ${receiptTx.gasUsed.toString()} gas units\n\n` +
        `This proves that your ballot was successfully tallied and remains immutable on the ledger.`
      );
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 650, margin: "2rem auto" }}>
      <button className="btn" onClick={onBack} style={{ marginBottom: "1.5rem" }}>
        &larr; Back to Landing
      </button>

      <div className="card">
        <h2>Cryptographic Ballot Verifier (E2E-V)</h2>
        <p className="muted" style={{ marginBottom: "1.5rem" }}>
          Paste your ballot receipt key, voter ID, candidate ID, and transaction hash to audit and verify that your vote was successfully tallied on-chain.
        </p>

        {error && <p className="error" style={{ whiteSpace: "pre-line", marginBottom: "1.5rem" }}>{error}</p>}
        {verificationResult && (
          <p className="success" style={{ color: "green", whiteSpace: "pre-line", border: "1px solid green", padding: "1.2rem", borderRadius: "4px", backgroundColor: "#f6fff6", marginBottom: "1.5rem" }}>
            {verificationResult}
          </p>
        )}

        <form onSubmit={handleVerify}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: "bold" }}>Ballot Receipt Key</label>
            <input
              type="text"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder="Paste your 64-character SHA-256 receipt key"
              style={{ width: "100%", padding: "0.5rem" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: "bold" }}>Voter User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Paste your User ID"
              style={{ width: "100%", padding: "0.5rem" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: "bold" }}>Voted Candidate ID</label>
            <input
              type="number"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="e.g. 1"
              style={{ width: "100%", padding: "0.5rem" }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.3rem", fontWeight: "bold" }}>On-chain Transaction Hash</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
              style={{ width: "100%", padding: "0.5rem" }}
              required
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Auditing Ledger..." : "Verify Vote tally"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReceiptVerifier;
