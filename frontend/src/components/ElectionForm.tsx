import React, { useState } from "react";

interface CandidateInput {
  id: number;
  name: string;
}

interface Props {
  onCreate: (payload: {
    name: string;
    startTime: number;
    endTime: number;
    candidates: CandidateInput[];
  }) => Promise<void>;
}

const ElectionForm: React.FC<Props> = ({ onCreate }) => {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    { id: 1, name: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCandidateChange = (index: number, field: "id" | "name", value: string) => {
    const next = [...candidates];
    if (field === "id") {
      next[index].id = Number(value);
    } else {
      next[index].name = value;
    }
    setCandidates(next);
  };

  const addCandidate = () => {
    setCandidates((prev) => [...prev, { id: prev.length + 1, name: "" }]);
  };

  const removeCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name || !startTime || !endTime || candidates.length === 0) {
      setError("Please fill in all fields and add at least one candidate.");
      return;
    }

    const startUnix = Math.floor(new Date(startTime).getTime() / 1000);
    const endUnix = Math.floor(new Date(endTime).getTime() / 1000);

    if (endUnix <= startUnix) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        name,
        startTime: startUnix,
        endTime: endUnix,
        candidates,
      });
      setSuccess("Election created successfully.");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create election.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Create Election</h2>
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Election name"
        />
      </label>
      <label className="field">
        <span>Start Time</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </label>
      <label className="field">
        <span>End Time</span>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </label>

      <div className="field">
        <span>Candidates</span>
        {candidates.map((c, index) => (
          <div key={index} className="candidate-row">
            <input
              type="number"
              value={c.id}
              onChange={(e) =>
                handleCandidateChange(index, "id", e.target.value)
              }
              className="candidate-id"
              min={1}
            />
            <input
              type="text"
              value={c.name}
              onChange={(e) =>
                handleCandidateChange(index, "name", e.target.value)
              }
              placeholder="Candidate name"
              className="candidate-name"
            />
            {candidates.length > 1 && (
              <button
                type="button"
                className="btn small"
                onClick={() => removeCandidate(index)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn small secondary"
          onClick={addCandidate}
        >
          Add Candidate
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <button type="submit" className="btn primary" disabled={loading}>
        {loading ? "Creating..." : "Create Election"}
      </button>
    </form>
  );
};

export default ElectionForm;

