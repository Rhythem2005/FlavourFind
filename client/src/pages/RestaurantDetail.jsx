import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { toggleSavedRestaurant, isRestaurantSaved, addToRecentlyViewed } from "../utils/storage";

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
  greenDim: "rgba(34,197,94,0.12)",
  yellow: "#FACC15",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function RestaurantDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const restaurant = location.state?.restaurant;
  const alternatives = location.state?.alternatives || [];
  
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setIsSaved(isRestaurantSaved(restaurant.restaurant));
      addToRecentlyViewed(restaurant);
    }
  }, [restaurant]);

  if (!restaurant) {
    return (
      <div style={{ fontFamily: FONT, background: C.night }}>
        <Nav />
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 100 }}>
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <span style={{ fontSize: 64 }}>😕</span>
            <h1 style={{ color: C.white, fontSize: 32, fontWeight: 800, marginTop: 24, marginBottom: 12 }}>Restaurant not found</h1>
            <p style={{ color: C.slateLight, fontSize: 16, marginBottom: 28 }}>No restaurant data was provided.</p>
            <button
              onClick={() => navigate("/")}
              style={{
                background: C.brand, color: "#fff", border: "none", borderRadius: 12,
                padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              Back to Search
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSave = () => {
    const saved = toggleSavedRestaurant(restaurant);
    setIsSaved(saved);
  };

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />

      <main style={{ minHeight: "100vh", paddingTop: 88, paddingBottom: 80 }}>
        
        {/* Cover Section */}
        <div style={{
          height: 350, position: "relative", background: C.nightSurface,
          overflow: "hidden",
        }}>
          {restaurant.thumbnail ? (
            <img
              src={restaurant.thumbnail}
              alt={restaurant.restaurant}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, opacity: 0.15 }}>
              🍽️
            </div>
          )}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(13,13,15,0.4) 0%, rgba(13,13,15,0.95) 100%)",
          }} />

          {/* Details Content Overlaid */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px",
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                color: C.white, borderRadius: 10, padding: "8px 14px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20,
                backdropFilter: "blur(8px)",
              }}
            >
              ← Back
            </button>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{
                    background: C.brand, color: "#fff", fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 999, textTransform: "uppercase",
                  }}>
                    {restaurant.platform}
                  </span>
                  {restaurant.discount && (
                    <span style={{
                      background: C.greenDim, color: C.green, fontSize: 11, fontWeight: 700,
                      padding: "3px 10px", borderRadius: 999,
                    }}>
                      ✓ {restaurant.discount}
                    </span>
                  )}
                </div>
                <h1 style={{ color: C.pureWhite, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>
                  {restaurant.restaurant}
                </h1>
                <p style={{ color: C.slateLight, fontSize: 16, marginTop: 8 }}>
                  {restaurant.cuisines || "Cuisines not specified"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleSave}
                  style={{
                    background: isSaved ? C.brand : "rgba(255,255,255,0.08)",
                    border: `1px solid ${isSaved ? C.brand : "rgba(255,255,255,0.15)"}`,
                    color: C.white, borderRadius: 14, padding: "14px 24px",
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                    backdropFilter: "blur(8px)", display: "flex", gap: 8, alignItems: "center",
                  }}
                >
                  {isSaved ? "★ Saved in Bookmarks" : "☆ Save Restaurant"}
                </button>
                <a
                  href={restaurant.restaurant_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: C.brand, color: "#fff",
                    borderRadius: 14, padding: "14px 28px",
                    fontSize: 15, fontWeight: 700, textDecoration: "none", cursor: "pointer",
                    boxShadow: `0 4px 20px ${C.brand}44`,
                  }}
                >
                  Order on Zomato →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Body Section */}
        <div style={{ maxWidth: 1200, margin: "40px auto 0", padding: "0 24px" }}>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 40,
          }}>
            {/* Left Column: Key Stats & Location */}
            <div>
              <h3 style={{ color: C.white, fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Overview</h3>
              <div style={{
                background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 20,
                padding: "24px", display: "flex", flexDirection: "column", gap: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.nightBorder}`, paddingBottom: 12 }}>
                  <span style={{ color: C.slateLight, fontSize: 14 }}>Cost for Two</span>
                  <span style={{ color: C.white, fontSize: 16, fontWeight: 700 }}>₹{restaurant.price || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.nightBorder}`, paddingBottom: 12 }}>
                  <span style={{ color: C.slateLight, fontSize: 14 }}>Average Delivery Time</span>
                  <span style={{ color: C.white, fontSize: 16, fontWeight: 700 }}>⚡ {restaurant.delivery_time ? `${restaurant.delivery_time} mins` : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.nightBorder}`, paddingBottom: 12 }}>
                  <span style={{ color: C.slateLight, fontSize: 14 }}>Rating</span>
                  <span style={{ color: C.white, fontSize: 16, fontWeight: 700 }}>★ {restaurant.rating ? restaurant.rating.toFixed(1) : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.slateLight, fontSize: 14 }}>Cuisines</span>
                  <span style={{ color: C.white, fontSize: 14, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{restaurant.cuisines || "—"}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Alternatives */}
            <div>
              <h3 style={{ color: C.white, fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Similar Alternatives</h3>
              {alternatives.length === 0 ? (
                <p style={{ color: C.slateLight, fontSize: 14 }}>No alternatives found in the area.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {alternatives.slice(0, 3).map((alt, i) => (
                    <div
                      key={alt.restaurant + i}
                      onClick={() => navigate(`/restaurant/${encodeURIComponent(alt.restaurant)}`, { state: { restaurant: alt, alternatives } })}
                      style={{
                        background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 16,
                        padding: "16px", display: "flex", gap: 16, alignItems: "center", cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.nightSurface}
                      onMouseLeave={e => e.currentTarget.style.background = C.nightCard}
                    >
                      {alt.thumbnail ? (
                        <img
                          src={alt.thumbnail}
                          alt={alt.restaurant}
                          style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 10, background: C.nightSurface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                          🍽️
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ color: C.white, fontSize: 15, fontWeight: 700 }}>{alt.restaurant}</div>
                        <div style={{ color: C.slate, fontSize: 12, marginTop: 4 }}>
                          ₹{alt.price || "—"} for two · {alt.delivery_time || "—"} min
                        </div>
                      </div>
                      <div style={{ color: C.brand, fontSize: 13, fontWeight: 700 }}>View →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
