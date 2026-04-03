import { useState } from "react";

import { dashboardService } from "../services/dashboardService";

export function PythonApiPage() {
  const [channelId, setChannelId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getBackendHealth();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const sendSample = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.sendThingSpeakWebhook({
        channel_id: "demo",
        field1: "AA:BB:CC:DD",
        field2: "PC-01",
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const pullChannel = async () => {
    if (!channelId) {
      return;
    }
    setLoading(true);
    try {
      const data = await dashboardService.pullThingSpeakChannel(channelId);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Pruebas API</h2>
      <div className="row">
        <button onClick={checkHealth} disabled={loading}>
          Consultar health
        </button>
        <button onClick={sendSample} disabled={loading}>
          Enviar payload de prueba
        </button>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Canal ThingSpeak"
          value={channelId}
          onChange={(event) => setChannelId(event.target.value)}
        />
        <button onClick={pullChannel} disabled={loading || !channelId}>
          Consultar canal
        </button>
      </div>
      <div style={{ marginTop: 16 }}>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  );
}
