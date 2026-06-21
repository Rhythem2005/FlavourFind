import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { getSearchHistory, calculateStats } from "../utils/storage";

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
  yellow: "#FACC15",
  blue: "#3B82F6",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function FoodInsights() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSearches: 0,
    savedCount: 0,
    averageSavingsPerSearch: 0,
    restaurantsDiscovered: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [speedData, setSpeedData] = useState([]);

  useEffect(() => {
    const localStats = calculateStats();
    setStats(localStats);

    const history = getSearchHistory();
    
    // Format data for Cuisine Price Chart
    // We group by query title and get average price
    const cuisineGroup = {};
    history.forEach(h => {
      const q = h.query.trim().toLowerCase();
      if (!cuisineGroup[q]) {
        cuisineGroup[q] = { name: h.query, prices: [] };
      }
      if (h.averagePrice) cuisineGroup[q].prices.push(h.averagePrice);
    });

    const formattedCuisines = Object.keys(cuisineGroup).map(k => {
      const g = cuisineGroup[k];
      const avg = g.prices.length ? Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length) : 0;
      return { name: g.name, price: avg };
    }).filter(item => item.price > 0).slice(0, 6);

    // Format speed data for Delivery Speed chart
    const formattedSpeed = history.map((h, i) => ({
      name: `Search ${history.length - i}`,
      cheapest: h.cheapestPrice || 0,
      average: h.averagePrice || 0,
    })).reverse().slice(-10);

    // Fallbacks if history is empty
    if (formattedCuisines.length === 0) {
      setChartData([
        { name: "Pizza", price: 450 },
        { name: "Burger", price: 280 },
        { name: "Biryani", price: 320 },
        { name: "Sushi", price: 750 },
      ]);
    } else {
      setChartData(formattedCuisines);
    }

    if (formattedSpeed.length === 0) {
      setSpeedData([
        { name: "Search 1", cheapest: 250, average: 320 },
        { name: "Search 2", cheapest: 180, average: 290 },
        { name: "Search 3", cheapest: 390, average: 450 },
        { name: "Search 4", cheapest: 220, average: 310 },
      ]);
    } else {
      setSpeedData(formattedSpeed);
    }

  }, []);

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
              Food Savings & Insights
            </h1>
            <p style={{ color: C.slateLight, fontSize: 15, marginTop: 6 }}>
              Visual analytics generated from your search queries and platform comparisons.
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 40,
          }}>
            {[
              { label: "Total Searches Run", value: stats.totalSearches, desc: "Queries evaluated", icon: "🔍", color: C.blue },
              { label: "Average Savings Found", value: `₹${stats.averageSavingsPerSearch}`, desc: "Per platform comparison", icon: "💰", color: C.green },
              { label: "Restaurants Discovered", value: stats.restaurantsDiscovered, desc: "Logged in local index", icon: "🍽️", color: C.brand },
              { label: "Saved Bookmarks", value: stats.savedCount, desc: "Favorite choices", icon: "⭐", color: C.yellow },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: C.nightCard,
                  border: `1px solid ${C.nightBorder}`,
                  borderRadius: 20, padding: "24px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: C.slateLight, fontSize: 14, fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                </div>
                <div style={{ color: C.white, fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{s.value}</div>
                <div style={{ color: C.slate, fontSize: 12 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Charts Layout */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            gap: 24,
          }}>
            {/* Chart 1: Average Price per Cuisine */}
            <div style={{
              background: C.nightCard,
              border: `1px solid ${C.nightBorder}`,
              borderRadius: 24, padding: "28px",
            }}>
              <h3 style={{ color: C.white, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Cuisine Cost Profiles</h3>
              <p style={{ color: C.slateLight, fontSize: 13, marginBottom: 24 }}>Average price matching your search items.</p>
              
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.nightBorder} />
                    <XAxis dataKey="name" stroke={C.slateLight} fontSize={12} tickLine={false} />
                    <YAxis stroke={C.slateLight} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: C.nightCard, borderColor: C.nightBorder, borderRadius: 8, color: C.white }}
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    />
                    <Bar dataKey="price" fill={C.brand} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Savings Gap Analysis */}
            <div style={{
              background: C.nightCard,
              border: `1px solid ${C.nightBorder}`,
              borderRadius: 24, padding: "28px",
            }}>
              <h3 style={{ color: C.white, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Savings Opportunities</h3>
              <p style={{ color: C.slateLight, fontSize: 13, marginBottom: 24 }}>Comparison gap between average and cheapest option.</p>

              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.nightBorder} />
                    <XAxis dataKey="name" stroke={C.slateLight} fontSize={12} tickLine={false} />
                    <YAxis stroke={C.slateLight} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: C.nightCard, borderColor: C.nightBorder, borderRadius: 8, color: C.white }} />
                    <Area type="monotone" dataKey="average" stackId="1" stroke={C.slateLight} fill="rgba(107, 114, 128, 0.2)" />
                    <Area type="monotone" dataKey="cheapest" stackId="2" stroke={C.green} fill="rgba(34, 197, 94, 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
