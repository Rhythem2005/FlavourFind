import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { toggleSavedRestaurant, isRestaurantSaved } from "../utils/storage";

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
  greenDim: "rgba(34,197,94,0.12)",
  yellow: "#FACC15",
  yellowDim: "rgba(250,204,21,0.10)",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Comparison() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialRestaurants = location.state?.restaurants || [];
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [savedStatus, setSavedStatus] = useState({});

  useEffect(() => {
    // Initialize saved status
    const status = {};
    restaurants.forEach(r => {
      status[r.restaurant] = isRestaurantSaved(r.restaurant);
    });
    setSavedStatus(status);
  }, [restaurants]);

  const handleToggleSave = (r) => {
    const isSaved = toggleSavedRestaurant(r);
    setSavedStatus(prev => ({
      ...prev,
      [r.restaurant]: isSaved,
    }));
  };

  const handleRemove = (index) => {
    const updated = restaurants.filter((_, i) => i !== index);
    setRestaurants(updated);
  };

  if (!restaurants || restaurants.length === 0) {
    return (
      <div style={{ fontFamily: FONT, background: C.night }}>
        <Nav />
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 100 }}>
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <span style={{ fontSize: 64 }}>⚖️</span>
            <h1 style={{ color: C.white, fontSize: 32, fontWeight: 800, marginTop: 24, marginBottom: 12 }}>No restaurants selected</h1>
            <p style={{ color: C.slateLight, fontSize: 16, marginBottom: 28 }}>Select restaurants on the search results page to compare them side-by-side.</p>
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

  // Find winners in categories to show badges
  const prices = restaurants.map(r => r.price).filter(p => p != null && p > 0);
  const deliveryTimes = restaurants.map(r => r.delivery_time).filter(t => t != null && t > 0);
  const ratings = restaurants.map(r => r.rating).filter(r => r != null && r > 0);

  const minPrice = prices.length ? Math.min(...prices) : null;
  const minDelivery = deliveryTimes.length ? Math.min(...deliveryTimes) : null;
  const maxRating = ratings.length ? Math.max(...ratings) : null;

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />
      
      <main style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: `1px solid ${C.nightBorder}`,
                color: C.slateLight, borderRadius: 10, padding: "8px 14px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
              }}
            >
              ← Back to Results
            </button>
            <h1 style={{ color: C.white, fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Side-by-Side Comparison
            </h1>
            <p style={{ color: C.slateLight, fontSize: 15, marginTop: 6 }}>
              Compare pricing, speed, rating, and value metrics to choose the perfect meal.
            </p>
          </div>

          {/* Comparison Matrix */}
          <div style={{
            background: C.nightCard,
            border: `1px solid ${C.nightBorder}`,
            borderRadius: 24,
            overflow: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <th style={{ padding: "24px", textAlign: "left", color: C.slateLight, fontSize: 13, fontWeight: 600, width: "200px" }}>
                    Metric
                  </th>
                  {restaurants.map((r, i) => (
                    <th key={r.restaurant + i} style={{ padding: "24px", textAlign: "center", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        {r.thumbnail ? (
                          <img
                            src={r.thumbnail}
                            alt={r.restaurant}
                            style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ width: 80, height: 80, borderRadius: 16, background: C.nightSurface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
                            🍽️
                          </div>
                        )}
                        <div>
                          <div style={{ color: C.white, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{r.restaurant}</div>
                          <div style={{ color: C.slate, fontSize: 12, marginTop: 4 }}>via {r.platform}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleToggleSave(r)}
                            style={{
                              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.nightBorder}`,
                              borderRadius: 8, padding: "6px 12px", color: savedStatus[r.restaurant] ? C.brand : C.slateLight,
                              fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", gap: 4, alignItems: "center",
                            }}
                          >
                            {savedStatus[r.restaurant] ? "★ Saved" : "☆ Save"}
                          </button>
                          {restaurants.length > 2 && (
                            <button
                              onClick={() => handleRemove(i)}
                              style={{
                                background: "none", border: "none", color: "#EF4444",
                                fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 8px",
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price Row */}
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <td style={{ padding: "20px 24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Price (Cost for Two)
                  </td>
                  {restaurants.map((r, i) => {
                    const isCheapest = r.price != null && r.price === minPrice;
                    return (
                      <td key={r.restaurant + i} style={{ padding: "20px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>
                          {r.price ? `₹${r.price}` : "—"}
                        </div>
                        {isCheapest && (
                          <span style={{
                            display: "inline-block", background: C.greenDim, color: C.green,
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginTop: 6,
                          }}>
                            ✓ CHEAPEST
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Delivery Time Row */}
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <td style={{ padding: "20px 24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Delivery Time
                  </td>
                  {restaurants.map((r, i) => {
                    const isFastest = r.delivery_time != null && r.delivery_time === minDelivery;
                    return (
                      <td key={r.restaurant + i} style={{ padding: "20px", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>
                          {r.delivery_time ? `${r.delivery_time} min` : "—"}
                        </div>
                        {isFastest && (
                          <span style={{
                            display: "inline-block", background: C.yellowDim, color: C.yellow,
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginTop: 6,
                          }}>
                            ⚡ FASTEST
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Rating Row */}
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <td style={{ padding: "20px 24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Rating
                  </td>
                  {restaurants.map((r, i) => {
                    const isTopRated = r.rating != null && r.rating === maxRating;
                    return (
                      <td key={r.restaurant + i} style={{ padding: "20px", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>
                          {r.rating ? `★ ${r.rating.toFixed(1)}` : "—"}
                        </div>
                        {isTopRated && (
                          <span style={{
                            display: "inline-block", background: "rgba(168,85,247,0.12)", color: "#A855F7",
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginTop: 6,
                          }}>
                            ★ TOP RATED
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Active Offer / Discount Row */}
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <td style={{ padding: "20px 24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Active Discount
                  </td>
                  {restaurants.map((r, i) => (
                    <td key={r.restaurant + i} style={{ padding: "20px", textAlign: "center", color: C.green, fontWeight: 700 }}>
                      {r.discount || "No offers"}
                    </td>
                  ))}
                </tr>

                {/* Cuisines Row */}
                <tr style={{ borderBottom: `1px solid ${C.nightBorder}` }}>
                  <td style={{ padding: "20px 24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Cuisines
                  </td>
                  {restaurants.map((r, i) => (
                    <td key={r.restaurant + i} style={{ padding: "20px", textAlign: "center", color: C.slateLight, fontSize: 13, lineHeight: 1.5 }}>
                      {r.cuisines || "—"}
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr>
                  <td style={{ padding: "24px", color: C.slateLight, fontSize: 14, fontWeight: 600 }}>
                    Proceed to Order
                  </td>
                  {restaurants.map((r, i) => (
                    <td key={r.restaurant + i} style={{ padding: "24px", textAlign: "center" }}>
                      <a
                        href={r.restaurant_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block", background: C.brand, color: "#fff",
                          textDecoration: "none", borderRadius: 12, padding: "10px 20px",
                          fontSize: 14, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Order on Zomato →
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tradeoff Explanation Section */}
          <div style={{
            marginTop: 40,
            background: `linear-gradient(135deg, ${C.nightCard} 0%, ${C.nightSurface} 100%)`,
            border: `1px solid ${C.nightBorder}`,
            borderRadius: 20,
            padding: "28px 32px",
          }}>
            <h3 style={{ color: C.white, fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Tradeoff & Value Analysis</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {restaurants.map((r, i) => {
                const advantages = [];
                if (r.price != null && minPrice && r.price === minPrice) advantages.push("saves you the most money");
                if (r.delivery_time != null && minDelivery && r.delivery_time === minDelivery) advantages.push("arrives the fastest");
                if (r.rating != null && maxRating && r.rating === maxRating) advantages.push("has the highest rating among options");
                if (r.discount) advantages.push(`offers a special deal (${r.discount})`);

                const description = advantages.length 
                  ? `Ordering from ${r.restaurant} is a great choice because it ${advantages.join(" and ")}.`
                  : `${r.restaurant} offers a balanced option with typical price and delivery times.`;

                return (
                  <div key={r.restaurant + i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      <strong style={{ color: C.white }}>{r.restaurant}:</strong> {description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
