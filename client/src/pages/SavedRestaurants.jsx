import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { getSavedRestaurants, toggleSavedRestaurant } from "../utils/storage";

const C = {
  brand: "#FF5C2B",
  night: "#0D0D0F",
  nightSurface: "#141417",
  nightCard: "#1A1A1E",
  nightBorder: "#2A2A30",
  slate: "#6B7280",
  slateLight: "#9CA3AF",
  white: "#F9FAFB",
  pureWhite: "#FFFFFF",
  green: "#22C55E",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function SavedRestaurants() {
  const navigate = useNavigate();
  const [savedList, setSavedList] = useState([]);

  useEffect(() => {
    setSavedList(getSavedRestaurants());
  }, []);

  const handleRemove = (r) => {
    toggleSavedRestaurant(r);
    setSavedList(getSavedRestaurants());
  };

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />

      <main style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
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
              Saved Restaurants
            </h1>
            <p style={{ color: C.slateLight, fontSize: 15, marginTop: 6 }}>
              Quick access to your favorite and bookmarked restaurants.
            </p>
          </div>

          {savedList.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 24px",
              background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 24,
            }}>
              <span style={{ fontSize: 48 }}>⭐</span>
              <h2 style={{ color: C.white, fontSize: 22, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
                No saved restaurants
              </h2>
              <p style={{ color: C.slateLight, fontSize: 15, maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Bookmark restaurants on the search results page to save them here for quick access later.
              </p>
              <button
                onClick={() => navigate("/")}
                style={{
                  background: C.brand, color: "#fff", border: "none", borderRadius: 12,
                  padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                Find Restaurants
              </button>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 24,
            }}>
              {savedList.map((item, index) => (
                <div
                  key={item.restaurant + index}
                  style={{
                    background: C.nightCard,
                    border: `1px solid ${C.nightBorder}`,
                    borderRadius: 20,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Image */}
                  <div style={{ height: 160, position: "relative", background: C.nightSurface }}>
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.restaurant}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, opacity: 0.3 }}>
                        🍽️
                      </div>
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(26,26,30,0.9))" }} />
                    
                    {/* Saved Star Badge */}
                    <button
                      onClick={() => handleRemove(item)}
                      style={{
                        position: "absolute", top: 12, right: 12,
                        background: "rgba(255,92,43,0.9)", border: "none",
                        borderRadius: 99, width: 32, height: 32,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 16, cursor: "pointer",
                      }}
                      title="Unsave Restaurant"
                    >
                      ★
                    </button>

                    {item.rating && (
                      <span style={{
                        position: "absolute", bottom: 12, right: 12,
                        background: C.green, color: "#fff",
                        fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                      }}>
                        ★ {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ color: C.pureWhite, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
                      {item.restaurant}
                    </h3>
                    <p style={{ color: C.slate, fontSize: 13, margin: "0 0 16px" }}>
                      {item.cuisines || "Cuisines not specified"}
                    </p>

                    <div style={{ marginTop: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <span style={{ color: C.pureWhite, fontSize: 20, fontWeight: 800 }}>
                            {item.price ? `₹${item.price}` : "—"}
                          </span>
                          <span style={{ color: C.slate, fontSize: 12, marginLeft: 4 }}>for two</span>
                        </div>
                        {item.delivery_time && (
                          <div style={{ fontSize: 13, color: C.slateLight, fontWeight: 600 }}>
                            ⚡ {item.delivery_time} min
                          </div>
                        )}
                      </div>

                      <a
                        href={item.restaurant_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block", width: "100%", background: "none", border: `1px solid ${C.brand}`,
                          color: C.brand, borderRadius: 12, padding: "10px", textAlign: "center",
                          fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          e.target.style.background = C.brand;
                          e.target.style.color = "#fff";
                        }}
                        onMouseLeave={e => {
                          e.target.style.background = "none";
                          e.target.style.color = C.brand;
                        }}
                      >
                        Order on Zomato
                      </a>
                    </div>
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
