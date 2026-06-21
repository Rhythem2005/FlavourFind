import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { getSearchHistory, clearSearchHistory } from "../utils/storage";
import { searchFood } from "../services/foodApi";

const C = {
  brand: "#FF5C2B",
  night: "#0D0D0F",
  nightSurface: "#141417",
  nightCard: "#1A1A1E",
  nightBorder: "#2A2A30",
  slate: "#6B7280",
  slateLight: "#9CA3AF",
  white: "#F9FAFB",
  green: "#22C55E",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function SearchHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState("");

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleClear = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const handleReTrigger = async (query) => {
    setLoading(true);
    setLoadingQuery(query);
    try {
      const response = await searchFood(query);
      navigate("/results", { state: response });
    } catch (err) {
      console.error(err);
      alert(`Unable to run search for "${query}". Please try again.`);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(13,13,15,0.95)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 20,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: "50%",
            border: `3px solid ${C.nightBorder}`, borderTopColor: C.brand,
            animation: "spin 1s linear infinite",
          }} />
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <div style={{ color: C.white, fontSize: 18, fontWeight: 700 }}>
            Re-triggering search for "{loadingQuery}"...
          </div>
          <div style={{ color: C.slateLight, fontSize: 14 }}>Connecting to delivery platforms</div>
        </div>
      )}

      <main style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
            <div>
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: "none", border: `1px solid ${C.nightBorder}`,
                  color: C.slateLight, borderRadius: 10, padding: "8px 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
                }}
              >
                ← Go Back
              </button>
              <h1 style={{ color: C.white, fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>
                Search History
              </h1>
              <p style={{ color: C.slateLight, fontSize: 15, marginTop: 6 }}>
                Re-run past queries instantly or view previous platform search logs.
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: "none", border: `1px solid ${C.nightBorder}`,
                  color: "#EF4444", borderRadius: 10, padding: "10px 18px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "border-color 0.2s",
                }}
                onMouseEnter={e => e.target.style.borderColor = "#EF4444"}
                onMouseLeave={e => e.target.style.borderColor = C.nightBorder}
              >
                Clear All History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 24px",
              background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 24,
            }}>
              <span style={{ fontSize: 48 }}>📜</span>
              <h2 style={{ color: C.white, fontSize: 22, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
                History is empty
              </h2>
              <p style={{ color: C.slateLight, fontSize: 15, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                Your search history will appear here once you start exploring options.
              </p>
            </div>
          ) : (
            <div style={{
              background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 20,
              overflow: "hidden",
            }}>
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  onClick={() => handleReTrigger(entry.query)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "20px 24px", borderBottom: index < history.length - 1 ? `1px solid ${C.nightBorder}` : "none",
                    cursor: "pointer", transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.nightSurface}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>🔍</span>
                    <div>
                      <div style={{ color: C.white, fontSize: 16, fontWeight: 700 }}>{entry.query}</div>
                      <div style={{ color: C.slate, fontSize: 12, marginTop: 4 }}>
                        {formatDate(entry.timestamp)} · {entry.resultsCount} restaurants found
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    {entry.cheapestPrice && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: C.slateLight, fontSize: 11 }}>Cheapest</div>
                        <div style={{ color: C.green, fontSize: 14, fontWeight: 700 }}>₹{entry.cheapestPrice}</div>
                      </div>
                    )}
                    <span style={{ color: C.brand, fontSize: 14, fontWeight: 700 }}>Search Again →</span>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
