import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { searchFood } from "../services/foodApi";
import { getSearchHistory, saveSearchToHistory, calculateStats } from "../utils/storage";

const COLORS = {
  brand: "#FF5C2B",
  night: "#0D0D0F",
  nightSurface: "#141417",
  nightCard: "#1A1A1E",
  nightBorder: "#2A2A30",
  slate: "#6B7280",
  slateLight: "#9CA3AF",
  white: "#FFFFFF",
  success: "#22C55E",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function FoodLensAI() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stats, setStats] = useState({
    totalSearches: 0,
    restaurantsDiscovered: 0,
    averageSavingsPerSearch: 0,
  });

  const searchContainerRef = useRef(null);

  useEffect(() => {
    // Load local history & stats
    setRecentSearches(getSearchHistory().slice(0, 5));
    setStats(calculateStats());

    // Click outside handler for search suggestions dropdown
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await searchFood(q);
      // Save search results to history
      saveSearchToHistory(q, response.results);
      navigate("/results", { state: response });
    } catch (err) {
      setError("Unable to retrieve search results. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text) => {
    setQuery(text);
    handleSearch(text);
  };

  return (
    <div style={{ fontFamily: FONT, background: COLORS.night, color: COLORS.white }}>
      <Nav />

      {/* Hero Section */}
      <section style={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute",
          top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 400,
          background: `radial-gradient(ellipse at center, ${COLORS.brand}12 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 760, width: "100%", textAlign: "center", position: "relative", zIndex: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{ marginBottom: 20 }}
          >
            <span style={{
              display: "inline-block",
              background: "rgba(255, 92, 43, 0.12)",
              color: COLORS.brand,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "3px 10px",
              borderRadius: 999,
              textTransform: "uppercase",
            }}>
              ✨ AI-Powered Platform Comparison
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              fontSize: "clamp(38px, 6vw, 68px)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              marginBottom: 24,
            }}
          >
            Find the best deal<br />
            <span style={{ color: COLORS.brand }}>on every food order.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{
              fontSize: 18, color: COLORS.slateLight,
              lineHeight: 1.6, marginBottom: 44,
              maxWidth: 540, margin: "0 auto 44px",
            }}
          >
            Instantly compare prices, offers, and delivery times across platforms. Get real-time recommendations to save money.
          </motion.p>

          {/* Search container */}
          <div ref={searchContainerRef} style={{ position: "relative", maxWidth: 620, margin: "0 auto 48px", zIndex: 20 }}>
            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "12px 16px",
                borderRadius: 12,
                marginBottom: 16,
                fontSize: 14,
                textAlign: "left",
              }}>
                {error}
              </div>
            )}

            <motion.form
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              style={{
                background: COLORS.nightCard,
                border: `1.5px solid ${showSuggestions ? COLORS.brand : COLORS.nightBorder}`,
                borderRadius: 18,
                padding: "6px 6px 6px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                transition: "border-color 0.2s ease",
              }}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search food (e.g. Pizza, Burger, Biryani)..."
                style={{
                  flex: 1, background: "transparent",
                  border: "none", outline: "none",
                  color: COLORS.white, fontSize: 16,
                  fontFamily: "inherit",
                  caretColor: COLORS.brand,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: COLORS.brand,
                  color: "#fff", border: "none",
                  borderRadius: 12,
                  padding: "12px 24px",
                  fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: loading ? 0.7 : 1,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Searching...
                  </>
                ) : (
                  "Compare →"
                )}
              </button>
            </motion.form>

            {/* Suggestions drop-down */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: "absolute", top: "105%", left: 0, right: 0,
                    background: COLORS.nightCard, border: `1px solid ${COLORS.nightBorder}`,
                    borderRadius: 16, padding: "16px", textAlign: "left",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    zIndex: 30,
                  }}
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Recent Searches
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {recentSearches.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSuggestionClick(item.query)}
                            style={{
                              padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 8, color: COLORS.slateLight,
                              fontSize: 14, transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = COLORS.white; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.slateLight; }}
                          >
                            <span>🕒</span>
                            <span>{item.query}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular Cuisines */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      Popular Categories
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["🍕 Pizza", "🍛 Biryani", "🥗 Salads", "🍔 Burgers", "🍣 Sushi"].map((cuisine) => (
                        <button
                          key={cuisine}
                          onClick={() => handleSuggestionClick(cuisine.split(" ")[1])}
                          style={{
                            background: COLORS.nightSurface, border: `1px solid ${COLORS.nightBorder}`,
                            color: COLORS.slateLight, borderRadius: 10, padding: "8px 14px",
                            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.brand; e.currentTarget.style.color = COLORS.white; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.nightBorder; e.currentTarget.style.color = COLORS.slateLight; }}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Simplified, High-Impact Value Prop (Linear style) */}
      <section style={{ background: COLORS.nightSurface, padding: "100px 24px", borderTop: `1px solid ${COLORS.nightBorder}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Smart comparison. Simple savings.
            </h2>
            <p style={{ color: COLORS.slateLight, fontSize: 16, marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
              We query delivery platforms in real time so you always get the best price.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {[
              { title: "1. Search Food", desc: "Type in whatever you are craving, from a quick pizza to a healthy power salad bowl.", icon: "🔍" },
              { title: "2. Compare Options", desc: "View live pricing, accurate delivery speeds, and verified discounts side-by-side.", icon: "⚖️" },
              { title: "3. Save Money", desc: "See at a glance which platform is offering the best overall deal after stackable offers.", icon: "💰" },
            ].map((prop, i) => (
              <div
                key={i}
                style={{
                  background: COLORS.nightCard,
                  border: `1px solid ${COLORS.nightBorder}`,
                  borderRadius: 20, padding: "32px",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{prop.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{prop.title}</h3>
                <p style={{ color: COLORS.slateLight, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Statistics Showcase */}
      {stats.totalSearches > 0 && (
        <section style={{ background: COLORS.night, padding: "80px 24px", borderTop: `1px solid ${COLORS.nightBorder}` }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Your Ordering Activity</h2>
            <p style={{ color: COLORS.slateLight, fontSize: 15, marginBottom: 40 }}>Real analytics generated from your search history.</p>

            <div style={{ display: "flex", justifyContent: "center", gap: 64, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.brand }}>{stats.totalSearches}</div>
                <div style={{ color: COLORS.slateLight, fontSize: 13, marginTop: 4 }}>Searches Run</div>
              </div>
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.success }}>₹{stats.averageSavingsPerSearch}</div>
                <div style={{ color: COLORS.slateLight, fontSize: 13, marginTop: 4 }}>Avg. Savings Opportunity</div>
              </div>
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.white }}>{stats.restaurantsDiscovered}</div>
                <div style={{ color: COLORS.slateLight, fontSize: 13, marginTop: 4 }}>Restaurants Logged</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Spinner stylesheet */}
      <style>{`
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <Footer />
    </div>
  );
}