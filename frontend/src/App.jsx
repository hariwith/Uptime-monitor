
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  History,
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api";

function App() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkResults, setCheckResults] = useState({});
  const [checkingIds, setCheckingIds] = useState([]);
  const [monitorStats, setMonitorStats] = useState({});
  const [monitorHistory, setMonitorHistory] = useState({});

  // Fetch saved statistics for a monitor
  const fetchMonitorStats = useCallback(async (monitorId) => {
    try {
      const response = await fetch(
        `${API_URL}/monitors/${monitorId}/stats/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const stats = await response.json();

      setMonitorStats((previous) => ({
        ...previous,
        [monitorId]: stats,
      }));
    } catch (err) {
      console.error("Statistics error:", err.message);
    }
  }, []);

  // Fetch saved health-check history
  const fetchMonitorHistory = useCallback(async (monitorId) => {
    try {
      const response = await fetch(
        `${API_URL}/monitors/${monitorId}/history/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch check history");
      }

      const history = await response.json();

      setMonitorHistory((previous) => ({
        ...previous,
        [monitorId]: history,
      }));
    } catch (err) {
      console.error("History error:", err.message);
    }
  }, []);

  // Fetch monitors, statistics, and history
  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/monitors/`);

      if (!response.ok) {
        throw new Error("Failed to fetch monitors");
      }

      const data = await response.json();
      setMonitors(data);

      await Promise.all(
        data.flatMap((monitor) => [
          fetchMonitorStats(monitor.id),
          fetchMonitorHistory(monitor.id),
        ])
      );
    } catch (err) {
      setError(err.message || "Unable to connect to Django");
    } finally {
      setLoading(false);
    }
  }, [fetchMonitorStats, fetchMonitorHistory]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  // Run a health check and refresh its saved data
  async function checkMonitor(monitorId) {
    setCheckingIds((ids) =>
      ids.includes(monitorId) ? ids : [...ids, monitorId]
    );

    try {
      const response = await fetch(
        `${API_URL}/monitors/${monitorId}/check/`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Health check failed (${response.status})`);
      }

      const result = await response.json();

      setCheckResults((previous) => ({
        ...previous,
        [monitorId]: result,
      }));

      await Promise.all([
        fetchMonitorStats(monitorId),
        fetchMonitorHistory(monitorId),
      ]);
    } catch (err) {
      setCheckResults((previous) => ({
        ...previous,
        [monitorId]: {
          is_up: false,
          error_message: err.message || "Health check failed",
        },
      }));
    } finally {
      setCheckingIds((ids) =>
        ids.filter((id) => id !== monitorId)
      );
    }
  }

  const activeMonitors = monitors.filter(
    (monitor) => monitor.is_active
  ).length;

  // Use the latest result, falling back to saved history
  const latestResults = monitors
    .map((monitor) => {
      const currentResult = checkResults[monitor.id];

      if (currentResult) {
        return currentResult;
      }

      const history = monitorHistory[monitor.id];

      if (history?.length > 0) {
        return history[0];
      }

      return null;
    })
    .filter(Boolean);

  const onlineCount = latestResults.filter(
    (result) => result.is_up
  ).length;

  const offlineCount = latestResults.filter(
    (result) => !result.is_up
  ).length;

  const responseTimes = latestResults
    .map((result) => result.response_time_ms)
    .filter(
      (time) => typeof time === "number" && Number.isFinite(time)
    );

  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((total, time) => total + time, 0) /
            responseTimes.length
        )
      : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Activity size={27} />
          <span>PulseMonitor</span>
        </div>

        <nav>
          <div className="nav-item active">
            <Globe size={19} />
            <span>Overview</span>
          </div>
        </nav>

        <div className="sidebar-footer">API Uptime Monitor</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Overview</h1>
            <p>Monitor your APIs and website availability.</p>
          </div>

          <button
            className="refresh-button"
            onClick={fetchMonitors}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-heading">
              <span>Total Monitors</span>
              <Globe size={20} />
            </div>
            <h2>{loading ? "—" : monitors.length}</h2>
            <p>Configured websites</p>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              <span>Online</span>
              <CheckCircle2 size={20} />
            </div>
            <h2>{onlineCount}</h2>
            <p>Latest successful checks</p>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              <span>Offline</span>
              <XCircle size={20} />
            </div>
            <h2>{offlineCount}</h2>
            <p>Latest failed checks</p>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              <span>Avg. Response</span>
              <Clock size={20} />
            </div>
            <h2>
              {averageResponseTime ?? "—"}
              <small> ms</small>
            </h2>
            <p>Across monitors with results</p>
          </div>
        </section>

        <section className="monitor-section">
          <div className="section-heading">
            <div>
              <h2>Your Monitors</h2>
              <p>Websites configured for monitoring</p>
            </div>

            <span className="monitor-count">
              {monitors.length}{" "}
              {monitors.length === 1 ? "monitor" : "monitors"}
            </span>
          </div>

          <div className="monitor-table">
            <div className="table-header">
              <span>MONITOR</span>
              <span>STATUS</span>
              <span>RESPONSE TIME</span>
              <span>ACTION</span>
            </div>

            {loading ? (
              <p>Loading monitors and statistics...</p>
            ) : error ? (
              <p>{error}</p>
            ) : monitors.length === 0 ? (
              <p>No monitors found. Add one through the Django API.</p>
            ) : (
              monitors.map((monitor) => {
                const result = checkResults[monitor.id];
                const history = monitorHistory[monitor.id] || [];
                const isChecking = checkingIds.includes(monitor.id);
                const latestResult = result || history[0];

                return (
                  <div className="monitor-row" key={monitor.id}>
                    <div className="monitor-info">
                      <div className="site-icon">
                        <Globe size={20} />
                      </div>

                      <div>
                        <h3>{monitor.name}</h3>

                        <a
                          href={monitor.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {monitor.url}
                        </a>

                        {monitorStats[monitor.id] && (
                          <p>
                            Uptime:{" "}
                            {monitorStats[monitor.id].uptime_percentage}%
                            {" · "}
                            Checks:{" "}
                            {monitorStats[monitor.id].total_checks}
                          </p>
                        )}

                        {history.length > 0 && (
                          <div className="history-preview">
                            <span>
                              <History size={13} />
                              Recent checks:
                            </span>

                            {history.slice(0, 3).map((item, index) => (
                              <span
                                key={item.id ?? `${item.checked_at}-${index}`}
                                className={`history-result ${
                                  item.is_up ? "status-up" : "status-down"
                                }`}
                                title={
                                  item.checked_at
                                    ? new Date(item.checked_at).toLocaleString()
                                    : "Previous check"
                                }
                              >
                                {item.is_up ? "UP" : "DOWN"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {!latestResult ? (
                        <span className="status-badge">
                          Not checked
                        </span>
                      ) : (
                        <span
                          className={`status-badge ${
                            latestResult.is_up
                              ? "status-up"
                              : "status-down"
                          }`}
                          title={latestResult.error_message || ""}
                        >
                          <span className="status-dot" />
                          {latestResult.is_up ? "UP" : "DOWN"}
                        </span>
                      )}
                    </div>

                    <div className="response-time">
                      {latestResult?.response_time_ms != null
                        ? `${latestResult.response_time_ms} ms`
                        : "—"}
                    </div>

                    <div>
                      <button
                        className="refresh-button"
                        onClick={() => checkMonitor(monitor.id)}
                        disabled={isChecking || !monitor.is_active}
                      >
                        <RefreshCw size={14} />
                        {isChecking ? "Checking..." : "Check Now"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="demo-note">
            Monitor configurations, saved statistics, and health-check
            history are retrieved from Django.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
