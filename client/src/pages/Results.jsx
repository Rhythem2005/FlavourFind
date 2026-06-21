import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { isRestaurantSaved, toggleSavedRestaurant } from "../utils/storage";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  brand: "#FF5C2B",
  brandLight: "#FF7A4E",
  brandDim: "rgba(255,92,43,0.12)",
  brandGlow: "rgba(255,92,43,0.06)",
  night: "#0D0D0F",
  nightSurface: "#141417",
  nightCard: "#1A1A1E",
  nightCardHover: "#202024",
  nightBorder: "#2A2A30",
  nightBorderLight: "#363640",
  slate: "#6B7280",
  slateLight: "#9CA3AF",
  white: "#F9FAFB",
  pureWhite: "#FFFFFF",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  yellow: "#FACC15",
  yellowDim: "rgba(250,204,21,0.10)",
  blue: "#3B82F6",
  blueDim: "rgba(59,130,246,0.10)",
  purple: "#A855F7",
  purpleDim: "rgba(168,85,247,0.10)",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const fmt = (n) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "—");

const ratingColor = (r) => {
  if (r == null) return C.slate;
  if (r >= 4.2) return C.green;
  if (r >= 3.8) return C.yellow;
  return C.brand;
};

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ children, color = C.brand, bg, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
    padding: "4px 10px", borderRadius: 999,
    color: color,
    background: bg || `${color}18`,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    ...style,
  }}>
    {children}
  </span>
);

const StarRating = ({ rating, size = 13 }) => {
  if (rating == null) return <span style={{ color: C.slate, fontSize: size }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: ratingColor(rating), color: "#fff",
        fontSize: size - 2, fontWeight: 800,
        padding: "2px 7px", borderRadius: 6, lineHeight: 1.3,
      }}>
        ★ {rating.toFixed(1)}
      </span>
    </span>
  );
};

const CategoryWinnerCard = ({ icon, label, item, color, bg, isActive, onClick }) => (
  <motion.button
    type="button"
    variants={fadeUp}
    whileHover={{ y: -3, borderColor: color + "66" }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    style={{
      background: isActive ? bg : C.nightCard,
      border: `1.5px solid ${isActive ? color + "55" : C.nightBorder}`,
      borderRadius: 16, padding: "18px 20px",
      cursor: "pointer", fontFamily: FONT,
      textAlign: "left", width: "100%",
      transition: "background 0.2s, border-color 0.2s",
      outline: "none",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
    {item ? (
      <>
        <div style={{
          color: C.pureWhite, fontSize: 15, fontWeight: 700,
          marginBottom: 4, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.restaurant}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: C.pureWhite, fontSize: 14, fontWeight: 800 }}>{fmt(item.price)}</span>
          <span style={{ color: C.slateLight, fontSize: 12 }}>·</span>
          <span style={{ color: C.slateLight, fontSize: 12 }}>{item.delivery_time ?? "—"} min</span>
          <span style={{ color: C.slateLight, fontSize: 12 }}>·</span>
          <StarRating rating={item.rating} size={11} />
        </div>
      </>
    ) : (
      <div style={{ color: C.slate, fontSize: 13 }}>No data</div>
    )}
  </motion.button>
);

const RestaurantCard = ({ item, index, badges = [], onCompareToggle, isCompared, onBookmarkToggle, isBookmarked, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasThumbnail = item.thumbnail && !imgError;

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={{ y: -5, borderColor: C.nightBorderLight }}
      style={{
        background: C.nightCard,
        border: `1px solid ${C.nightBorder}`,
        borderRadius: 20, overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.25s",
        display: "flex", flexDirection: "column",
        position: "relative",
      }}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div style={{
        position: "relative", height: 160, overflow: "hidden",
        background: hasThumbnail ? C.nightSurface : `linear-gradient(135deg, ${C.nightCard}, ${C.nightSurface})`,
      }}>
        {hasThumbnail && (
          <img
            src={item.thumbnail}
            alt={item.restaurant}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          />
        )}
        {!hasThumbnail && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 56, opacity: 0.3,
          }}>
            🍽️
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
          background: "linear-gradient(transparent, rgba(26,26,30,0.95))",
        }} />

        {/* Top left badges */}
        {badges.length > 0 && (
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap", zIndex: 5 }}>
            {badges.map((b, i) => (
              <Badge key={i} color={b.color} bg={b.bg} style={{ fontSize: 10, padding: "3px 8px" }}>
                {b.icon} {b.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Bookmark star (top-right) */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmarkToggle(); }}
          style={{
            position: "absolute", top: 10, right: item.discount ? 95 : 10, zIndex: 10,
            background: "rgba(13,13,15,0.7)", border: "none", borderRadius: 99,
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            color: isBookmarked ? C.brand : C.slateLight, cursor: "pointer",
            fontSize: 14,
          }}
        >
          {isBookmarked ? "★" : "☆"}
        </button>

        {/* Discount (top-right next to bookmark) */}
        {item.discount && (
          <div style={{
            position: "absolute", top: 10, right: 10, zIndex: 5,
            background: "rgba(34,197,94,0.95)", backdropFilter: "blur(8px)",
            color: "#fff", fontSize: 10, fontWeight: 800,
            padding: "4px 8px", borderRadius: 8,
          }}>
            {item.discount}
          </div>
        )}

        {/* Rating (bottom-right) */}
        <div style={{ position: "absolute", bottom: 10, right: 12, zIndex: 5 }}>
          <StarRating rating={item.rating} size={12} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          color: C.pureWhite, fontSize: 17, fontWeight: 700,
          margin: "0 0 4px", lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.restaurant}
        </h3>

        {item.cuisines && (
          <p style={{
            color: C.slate, fontSize: 12, margin: "0 0 14px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {item.cuisines}
          </p>
        )}

        <div style={{ marginTop: "auto" }}>
          {/* Price + delivery row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div>
              <span style={{ color: C.pureWhite, fontSize: 20, fontWeight: 800 }}>{fmt(item.price)}</span>
              <span style={{ color: C.slate, fontSize: 12, marginLeft: 4 }}>for two</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.slateLight, fontSize: 18 }}>⚡</span>
              <span style={{ color: C.pureWhite, fontSize: 14, fontWeight: 600 }}>{item.delivery_time ?? "—"}</span>
              <span style={{ color: C.slate, fontSize: 12 }}>min</span>
            </div>
          </div>

          {/* Platform + Compare selection */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Badge color={C.brand}>{item.platform}</Badge>
            
            <label
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                color: isCompared ? COLORS.white : C.slateLight, cursor: "pointer", fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={isCompared}
                onChange={() => onCompareToggle()}
                style={{ accentColor: C.brand }}
              />
              Compare
            </label>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── AI Hero Recommendation ───────────────────────────────────────────────────
const AIHero = ({ item, query, results }) => {
  if (!item) return null;

  const cheapest = results.reduce((min, r) => (r.price != null && (min == null || r.price < min)) ? r.price : min, null);
  const avgPrice = results.filter(r => r.price).reduce((s, r, _, a) => s + r.price / a.length, 0);
  const priceDiff = avgPrice ? Math.round(((avgPrice - item.price) / avgPrice) * 100) : 0;

  const reasons = [];
  if (item.rating >= 4.0) reasons.push(`Rated ${item.rating}★ — in the top ${Math.round((1 - (item.rating - 3.0) / 2) * 100)}% of results`);
  if (item.delivery_time && item.delivery_time <= 30) reasons.push(`Delivers in just ${item.delivery_time} minutes`);
  if (priceDiff > 0) reasons.push(`${priceDiff}% below average price for "${query}"`);
  if (item.discount) reasons.push(`Active offer: ${item.discount}`);
  if (reasons.length < 3 && item.cuisines) reasons.push(`Cuisine: ${item.cuisines}`);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      style={{
        position: "relative",
        background: `linear-gradient(165deg, ${C.nightCard} 0%, ${C.night} 100%)`,
        border: `1px solid ${C.nightBorder}`,
        borderRadius: 28,
        padding: "0",
        marginBottom: 32,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {item.thumbnail && (
          <div style={{
            width: 280, minHeight: 280, flexShrink: 0,
            position: "relative", overflow: "hidden",
          }}>
            <img
              src={item.thumbnail}
              alt={item.restaurant}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 50%, rgba(26,26,30,0.98) 100%)",
            }} />
          </div>
        )}

        <div style={{ flex: 1, padding: "32px 36px", minWidth: 300 }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Badge color={C.green} bg={C.greenDim} style={{ fontSize: 11 }}>
              🏆 AI TOP PICK
            </Badge>
            <Badge color={C.slateLight} bg="rgba(255,255,255,0.04)">
              {results.length} restaurants analyzed
            </Badge>
          </div>

          <h2 style={{
            color: C.pureWhite, fontSize: 32, fontWeight: 800,
            margin: "0 0 4px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            {item.restaurant}
          </h2>

          {item.cuisines && (
            <p style={{ color: C.slate, fontSize: 14, margin: "0 0 20px" }}>
              {item.cuisines}
            </p>
          )}

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.pureWhite }}>{fmt(item.price)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Delivery</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.pureWhite }}>{item.delivery_time ?? "—"}<span style={{ fontSize: 14, color: C.slate, marginLeft: 2 }}>min</span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Rating</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: ratingColor(item.rating) }}>★ {item.rating?.toFixed(1) ?? "—"}</div>
            </div>
          </div>

          {reasons.length > 0 && (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${C.nightBorder}`,
              borderRadius: 14, padding: "14px 18px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em" }}>
                🧠 WHY THIS PICK
              </div>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < reasons.length - 1 ? 6 : 0 }}>
                  <span style={{ color: C.green, fontSize: 12, marginTop: 1 }}>✓</span>
                  <span style={{ color: C.slateLight, fontSize: 13, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          )}

          <a
            href={item.restaurant_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.brand, color: "#fff",
              border: "none", borderRadius: 14,
              padding: "14px 28px", fontSize: 15, fontWeight: 700,
              cursor: "pointer", textDecoration: "none",
              boxShadow: `0 4px 24px ${C.brand}44`,
            }}
          >
            Order on {item.platform} →
          </a>
        </div>
      </div>
    </motion.section>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "relevance", label: "Relevance" },
  { key: "price_low", label: "Price: Low → High" },
  { key: "price_high", label: "Price: High → Low" },
  { key: "rating", label: "Highest Rated" },
  { key: "delivery", label: "Fastest Delivery" },
];

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;
  
  const [sortKey, setSortKey] = useState("relevance");
  const [activeWinner, setActiveWinner] = useState(null);
  
  // Custom Filters state
  const [priceRange, setPriceRange] = useState(1000);
  const [deliveryFilter, setDeliveryFilter] = useState(60);
  const [ratingFilter, setRatingFilter] = useState(0);

  // Compare & Bookmark state
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [bookmarkedItems, setBookmarkedItems] = useState({});

  useEffect(() => {
    if (data?.results) {
      // Load bookmark status for all results
      const bookmarks = {};
      data.results.forEach(item => {
        bookmarks[item.restaurant] = isRestaurantSaved(item.restaurant);
      });
      setBookmarkedItems(bookmarks);
    }
  }, [data]);

  const handleBookmarkToggle = (item) => {
    const isSaved = toggleSavedRestaurant(item);
    setBookmarkedItems(prev => ({
      ...prev,
      [item.restaurant]: isSaved,
    }));
  };

  const handleCompareToggle = (item) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(r => r.restaurant.toLowerCase() === item.restaurant.toLowerCase());
      if (exists) {
        return prev.filter(r => r.restaurant.toLowerCase() !== item.restaurant.toLowerCase());
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 restaurants at a time.");
          return prev;
        }
        return [...prev, item];
      }
    });
  };

  if (!data || !data.query) {
    return (
      <div style={{ fontFamily: FONT, background: C.night }}>
        <Nav />
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 100 }}>
          <div style={{ textAlign: "center", maxWidth: 500, padding: "0 24px" }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>🔍</div>
            <h1 style={{ color: C.white, fontSize: 40, fontWeight: 900, marginBottom: 12 }}>No results yet</h1>
            <p style={{ color: C.slateLight, fontSize: 17, marginBottom: 32 }}>Search for any dish to see recommendations.</p>
            <button
              onClick={() => navigate("/")}
              style={{
                background: C.brand, color: "#fff", border: "none", borderRadius: 14,
                padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer",
              }}
            >
              ← Back to Search
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const results = data.results || [];

  // Filter application
  const filteredResults = results.filter(item => {
    const priceMatch = item.price == null || item.price <= priceRange;
    const deliveryMatch = item.delivery_time == null || item.delivery_time <= deliveryFilter;
    const ratingMatch = item.rating == null || item.rating >= ratingFilter;
    return priceMatch && deliveryMatch && ratingMatch;
  });

  // Sort application
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortKey === "price_low") return (a.price ?? 9999) - (b.price ?? 9999);
    if (sortKey === "price_high") return (b.price ?? 0) - (a.price ?? 0);
    if (sortKey === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortKey === "delivery") return (a.delivery_time ?? 9999) - (b.delivery_time ?? 9999);
    return 0; // relevance
  });

  const hasResults = results.length > 0;

  // Stats computation
  const cheapestPrice = results.reduce((m, r) => r.price != null && (m == null || r.price < m) ? r.price : m, null);
  const fastestTime = results.reduce((m, r) => r.delivery_time != null && (m == null || r.delivery_time < m) ? r.delivery_time : m, null);
  const highestRating = results.reduce((m, r) => r.rating != null && (m == null || r.rating > m) ? r.rating : m, null);

  const getBadges = (item) => {
    const b = [];
    if (data.best_overall && item.restaurant === data.best_overall.restaurant) b.push({ icon: "🏆", label: "Best", color: "#fff", bg: C.brand });
    if (data.cheapest && item.restaurant === data.cheapest.restaurant) b.push({ icon: "💰", label: "Cheapest", color: C.green, bg: C.greenDim });
    if (data.fastest && item.restaurant === data.fastest.restaurant) b.push({ icon: "⚡", label: "Fastest", color: C.yellow, bg: C.yellowDim });
    if (data.highest_rated && item.restaurant === data.highest_rated.restaurant) b.push({ icon: "⭐", label: "Top Rated", color: C.purple, bg: C.purpleDim });
    return b;
  };

  const winners = [
    { key: "best_overall", icon: "🏆", label: "Best Overall", color: C.brand, bg: C.brandDim, item: data.best_overall },
    { key: "cheapest", icon: "💰", label: "Cheapest", color: C.green, bg: C.greenDim, item: data.cheapest },
    { key: "fastest", icon: "⚡", label: "Fastest", color: C.yellow, bg: C.yellowDim, item: data.fastest },
    { key: "highest_rated", icon: "⭐", label: "Top Rated", color: C.purple, bg: C.purpleDim, item: data.highest_rated },
  ];

  // Price analysis chart data
  const chartData = sortedResults.slice(0, 8).map(item => ({
    name: item.restaurant.length > 15 ? `${item.restaurant.substring(0, 15)}...` : item.restaurant,
    price: item.price || 0,
  }));

  // Tradeoff Analysis Block calculation
  const getTradeoffDescription = () => {
    if (!data.cheapest || !data.fastest) return null;
    const priceDiff = (data.fastest.price || 0) - (data.cheapest.price || 0);
    const speedDiff = (data.cheapest.delivery_time || 0) - (data.fastest.delivery_time || 0);
    
    if (priceDiff > 0 && speedDiff > 0) {
      return `The Cheapest option (${data.cheapest.restaurant}) saves you ₹${priceDiff} but takes ${speedDiff} minutes longer to deliver than the Fastest option (${data.fastest.restaurant}).`;
    }
    return `Balanced options available: Cheapest is ₹${data.cheapest.price} and Fastest is ${data.fastest.delivery_time} min.`;
  };

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />

      <main style={{ background: C.night, minHeight: "100vh", paddingTop: 88, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: 32 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  background: "none", border: `1px solid ${C.nightBorder}`,
                  color: C.slateLight, borderRadius: 10, padding: "8px 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                ← New Search
              </button>
              <Badge color={C.brand}>AI Powered</Badge>
              {hasResults && (
                <span style={{ color: C.slate, fontSize: 13 }}>
                  {results.length} restaurants found
                </span>
              )}
            </div>

            <h1 style={{
              color: C.pureWhite, fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 900, margin: 0, letterSpacing: "-0.03em", lineHeight: 1.15,
            }}>
              Best <span style={{ color: C.brand }}>{data.query}</span> near you
            </h1>
          </motion.div>

          {hasResults ? (
            <>
              {/* AI Hero */}
              <AIHero
                item={data.best_overall}
                query={data.query}
                results={results}
              />

              {/* Category Winners Strip */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 14,
                  marginBottom: 32,
                }}
              >
                {winners.map((w) => (
                  <CategoryWinnerCard
                    key={w.key}
                    {...w}
                    isActive={activeWinner === w.key}
                    onClick={() => {
                      setActiveWinner(activeWinner === w.key ? null : w.key);
                      if (w.item) {
                        navigate(`/restaurant/${encodeURIComponent(w.item.restaurant)}`, { state: { restaurant: w.item, alternatives: results } });
                      }
                    }}
                  />
                ))}
              </motion.div>

              {/* Tradeoff & Price Analysis Block */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
                gap: 24,
                marginBottom: 40,
              }}>
                {/* Visual Chart */}
                <div style={{
                  background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 24,
                  padding: "24px",
                }}>
                  <h3 style={{ color: C.white, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Cost Comparison Matrix</h3>
                  <div style={{ width: "100%", height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke={C.slateLight} fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ background: C.nightCard, borderColor: C.nightBorder, color: C.white }} />
                        <Bar dataKey="price" fill={C.brand} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tradeoff explanation */}
                <div style={{
                  background: `linear-gradient(135deg, ${C.nightCard} 0%, ${C.nightSurface} 100%)`,
                  border: `1px solid ${C.nightBorder}`, borderRadius: 24,
                  padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🧠</span>
                    <div>
                      <h4 style={{ color: C.white, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>AI Tradeoff Insights</h4>
                      <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                        {getTradeoffDescription()} Choose Cheapest for maximum savings, or Fastest if you are in a rush.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Controls Sidebar & Sort Bar */}
              <div style={{
                background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 20,
                padding: "20px 24px", marginBottom: 32,
                display: "flex", flexDirection: "column", gap: 20,
              }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <h2 style={{ color: C.pureWhite, fontSize: 20, fontWeight: 800, margin: 0 }}>Filters & Controls</h2>
                  
                  {/* Sort Bar */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSortKey(opt.key)}
                        style={{
                          background: sortKey === opt.key ? C.brand : "rgba(255,255,255,0.04)",
                          border: `1px solid ${sortKey === opt.key ? C.brand : C.nightBorder}`,
                          color: sortKey === opt.key ? "#fff" : C.slateLight,
                          borderRadius: 10, padding: "7px 14px",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                  {/* Price Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: C.slateLight, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                      <span>Max Price (For Two)</span>
                      <span style={{ color: C.white }}>₹{priceRange}</span>
                    </div>
                    <input
                      type="range"
                      min={cheapestPrice || 100}
                      max={2000}
                      step={50}
                      value={priceRange}
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      style={{ width: "100%", accentColor: C.brand }}
                    />
                  </div>

                  {/* Speed Slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: C.slateLight, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                      <span>Max Delivery Time</span>
                      <span style={{ color: C.white }}>{deliveryFilter} min</span>
                    </div>
                    <input
                      type="range"
                      min={fastestTime || 15}
                      max={90}
                      step={5}
                      value={deliveryFilter}
                      onChange={(e) => setDeliveryFilter(Number(e.target.value))}
                      style={{ width: "100%", accentColor: C.brand }}
                    />
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <div style={{ color: C.slateLight, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Min Rating</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0, 3.5, 4.0, 4.3].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRatingFilter(r)}
                          style={{
                            flex: 1, background: ratingFilter === r ? C.brand : "rgba(255,255,255,0.03)",
                            border: `1px solid ${ratingFilter === r ? C.brand : C.nightBorder}`,
                            color: C.white, borderRadius: 8, padding: "6px 8px", fontSize: 12, cursor: "pointer",
                          }}
                        >
                          {r === 0 ? "All" : `${r}★+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 20,
                }}
              >
                {sortedResults.map((item, index) => (
                  <RestaurantCard
                    key={item.restaurant + index}
                    item={item}
                    index={index}
                    badges={getBadges(item)}
                    isCompared={selectedForCompare.some(r => r.restaurant.toLowerCase() === item.restaurant.toLowerCase())}
                    onCompareToggle={() => handleCompareToggle(item)}
                    isBookmarked={bookmarkedItems[item.restaurant] || false}
                    onBookmarkToggle={() => handleBookmarkToggle(item)}
                    onClick={() => navigate(`/restaurant/${encodeURIComponent(item.restaurant)}`, { state: { restaurant: item, alternatives: results } })}
                  />
                ))}
              </motion.div>

              {/* Quick Insight Footer */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: 48,
                  background: C.nightCard, border: `1px solid ${C.nightBorder}`, borderRadius: 20,
                  padding: "28px 32px",
                  display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center",
                }}
              >
                {[
                  { label: "Restaurants Found", value: results.length, icon: "🍽️" },
                  { label: "Cheapest Deal", value: cheapestPrice != null ? fmt(cheapestPrice) : "—", icon: "💰" },
                  { label: "Fastest Speed", value: fastestTime != null ? `${fastestTime} min` : "—", icon: "⚡" },
                  { label: "Highest Rating", value: highestRating != null ? `${highestRating.toFixed(1)} ★` : "—", icon: "⭐" },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ textAlign: "center", minWidth: 120 }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                    <div style={{ color: C.pureWhite, fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{value}</div>
                    <div style={{ color: C.slate, fontSize: 12 }}>{label}</div>
                  </div>
                ))}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", padding: "80px 0" }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>😕</div>
              <h2 style={{ color: C.pureWhite, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                No restaurants found matching filters
              </h2>
              <p style={{ color: C.slateLight, fontSize: 16, marginBottom: 28 }}>
                Try relaxing your price, delivery, or rating filters.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Floating Comparison Drawer */}
      <AnimatePresence>
        {selectedForCompare.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
              background: COLORS.nightCard, border: `1.5px solid ${C.brand}`, borderRadius: 20,
              padding: "16px 28px", boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", gap: 32, zIndex: 500, width: "90%", maxWidth: 650,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.white, fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Compare Restaurants</div>
              <div style={{ color: C.slateLight, fontSize: 12 }}>
                {selectedForCompare.length} of 3 selected.
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 10 }}>
              {selectedForCompare.map((r, idx) => (
                <div key={r.restaurant + idx} style={{ position: "relative" }}>
                  {r.thumbnail ? (
                    <img
                      src={r.thumbnail}
                      alt={r.restaurant}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: COLORS.nightSurface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      🍽️
                    </div>
                  )}
                  <button
                    onClick={() => handleCompareToggle(r)}
                    style={{
                      position: "absolute", top: -6, right: -6, background: "#EF4444", color: "#fff",
                      border: "none", borderRadius: 99, width: 16, height: 16, fontSize: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/compare", { state: { restaurants: selectedForCompare } })}
              disabled={selectedForCompare.length < 2}
              style={{
                background: selectedForCompare.length < 2 ? C.nightBorder : C.brand,
                color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px",
                fontSize: 14, fontWeight: 700, cursor: selectedForCompare.length < 2 ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              Compare Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}