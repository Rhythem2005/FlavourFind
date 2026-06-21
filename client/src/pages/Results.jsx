import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

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

// ─── Utility Helpers ──────────────────────────────────────────────────────────
const fmt = (n) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "—");

const ratingColor = (r) => {
  if (r == null) return C.slate;
  if (r >= 4.2) return C.green;
  if (r >= 3.8) return C.yellow;
  return C.brand;
};

const confidenceScore = (item, cheapestPrice, fastestTime, highestRating) => {
  if (!item) return 0;
  let score = 0;
  if (item.rating != null && highestRating) score += (item.rating / highestRating) * 40;
  if (item.price != null && cheapestPrice) score += (cheapestPrice / item.price) * 30;
  if (item.delivery_time != null && fastestTime) score += (fastestTime / item.delivery_time) * 30;
  return Math.min(Math.round(score), 99);
};

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
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

const ConfidenceBar = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <div style={{
      flex: 1, height: 4, borderRadius: 99,
      background: C.nightBorder, overflow: "hidden",
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        style={{
          height: "100%", borderRadius: 99,
          background: value >= 80 ? C.green : value >= 60 ? C.yellow : C.brand,
        }}
      />
    </div>
    <span style={{ fontSize: 12, fontWeight: 700, color: C.slateLight, minWidth: 28, textAlign: "right" }}>
      {value}%
    </span>
  </div>
);

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

const RestaurantCard = ({ item, index, badges = [], onViewDeal }) => {
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
      }}
      onClick={onViewDeal}
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

        {/* Badges (top-left) */}
        {badges.length > 0 && (
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {badges.map((b, i) => (
              <Badge key={i} color={b.color} bg={b.bg} style={{ fontSize: 10, padding: "3px 8px", backdropFilter: "blur(8px)" }}>
                {b.icon} {b.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Discount (top-right) */}
        {item.discount && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(34,197,94,0.9)", backdropFilter: "blur(8px)",
            color: "#fff", fontSize: 11, fontWeight: 800,
            padding: "4px 10px", borderRadius: 8,
          }}>
            {item.discount}
          </div>
        )}

        {/* Rating (bottom-right) */}
        <div style={{ position: "absolute", bottom: 10, right: 12 }}>
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

          {/* Platform + CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Badge color={C.brand}>{item.platform}</Badge>
            <motion.span
              whileHover={{ x: 3 }}
              style={{ color: C.brand, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              View Deal →
            </motion.span>
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
  const savings = cheapest != null && item.price != null ? item.price - cheapest : null;
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
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -80, right: -80,
        width: 300, height: 300,
        background: `radial-gradient(circle, ${C.brand}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {/* Left: Thumbnail */}
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

        {/* Right: Content */}
        <div style={{ flex: 1, padding: "32px 36px", minWidth: 300 }}>
          {/* Header badge */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}
          >
            <Badge color={C.green} bg={C.greenDim} style={{ fontSize: 11 }}>
              🏆 AI TOP PICK
            </Badge>
            <Badge color={C.slateLight} bg="rgba(255,255,255,0.04)">
              {results.length} restaurants analyzed
            </Badge>
          </motion.div>

          {/* Restaurant name */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              color: C.pureWhite, fontSize: 32, fontWeight: 800,
              margin: "0 0 4px", letterSpacing: "-0.02em", lineHeight: 1.2,
            }}
          >
            {item.restaurant}
          </motion.h2>

          {item.cuisines && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ color: C.slate, fontSize: 14, margin: "0 0 20px" }}
            >
              {item.cuisines}
            </motion.p>
          )}

          {/* Key stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}
          >
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
            {item.discount && (
              <div>
                <div style={{ fontSize: 11, color: C.slate, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Offer</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{item.discount}</div>
              </div>
            )}
          </motion.div>

          {/* AI Reasoning */}
          {reasons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.nightBorder}`,
                borderRadius: 14, padding: "14px 18px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, marginBottom: 8, letterSpacing: "0.04em" }}>
                🧠 WHY THIS PICK
              </div>
              {reasons.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.08 }}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    marginBottom: i < reasons.length - 1 ? 6 : 0,
                  }}
                >
                  <span style={{ color: C.green, fontSize: 12, marginTop: 1 }}>✓</span>
                  <span style={{ color: C.slateLight, fontSize: 13, lineHeight: 1.5 }}>{r}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* CTA */}
          <motion.a
            href={item.restaurant_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
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
          </motion.a>
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

const sortResults = (results, sortKey) => {
  const sorted = [...results];
  switch (sortKey) {
    case "price_low": return sorted.sort((a, b) => (a.price ?? 9999) - (b.price ?? 9999));
    case "price_high": return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "rating": return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "delivery": return sorted.sort((a, b) => (a.delivery_time ?? 9999) - (b.delivery_time ?? 9999));
    default: return sorted;
  }
};

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;
  const [sortKey, setSortKey] = useState("relevance");
  const [activeWinner, setActiveWinner] = useState(null);
  const gridRef = useRef(null);

  // Empty state
  if (!data || !data.query) {
    return (
      <div style={{ fontFamily: FONT, background: C.night }}>
        <Nav />
        <main style={{
          background: C.night, minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          paddingTop: 100, paddingBottom: 80,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", maxWidth: 500, padding: "0 24px" }}
          >
            <div style={{ fontSize: 72, marginBottom: 24 }}>🔍</div>
            <h1 style={{
              color: C.pureWhite, fontSize: 40, fontWeight: 900,
              marginBottom: 12, letterSpacing: "-0.03em",
            }}>
              No results yet
            </h1>
            <p style={{ color: C.slateLight, fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>
              Search for any dish to see AI-powered restaurant recommendations.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/")}
              style={{
                background: C.brand, color: "#fff", border: "none", borderRadius: 14,
                padding: "14px 32px", fontSize: 16, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: `0 4px 20px ${C.brand}44`,
              }}
            >
              ← Back to Search
            </motion.button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  const results = data.results || [];
  const sortedResults = sortResults(results, sortKey);
  const hasResults = results.length > 0;

  // Compute stats for confidence
  const cheapestPrice = results.reduce((m, r) => r.price != null && (m == null || r.price < m) ? r.price : m, null);
  const fastestTime = results.reduce((m, r) => r.delivery_time != null && (m == null || r.delivery_time < m) ? r.delivery_time : m, null);
  const highestRating = results.reduce((m, r) => r.rating != null && (m == null || r.rating > m) ? r.rating : m, null);

  // Determine badges for each restaurant
  const getBadges = (item) => {
    const b = [];
    if (data.best_overall && item.restaurant === data.best_overall.restaurant) b.push({ icon: "🏆", label: "Best", color: "#fff", bg: C.brand });
    if (data.cheapest && item.restaurant === data.cheapest.restaurant) b.push({ icon: "💰", label: "Cheapest", color: C.green, bg: C.greenDim });
    if (data.fastest && item.restaurant === data.fastest.restaurant) b.push({ icon: "⚡", label: "Fastest", color: C.yellow, bg: C.yellowDim });
    if (data.highest_rated && item.restaurant === data.highest_rated.restaurant) b.push({ icon: "⭐", label: "Top Rated", color: C.purple, bg: C.purpleDim });
    return b;
  };

  // Winner cards config
  const winners = [
    { key: "best_overall", icon: "🏆", label: "Best Overall", color: C.brand, bg: C.brandDim, item: data.best_overall },
    { key: "cheapest", icon: "💰", label: "Cheapest", color: C.green, bg: C.greenDim, item: data.cheapest },
    { key: "fastest", icon: "⚡", label: "Fastest", color: C.yellow, bg: C.yellowDim, item: data.fastest },
    { key: "highest_rated", icon: "⭐", label: "Top Rated", color: C.purple, bg: C.purpleDim, item: data.highest_rated },
  ];

  const handleWinnerClick = (key) => {
    setActiveWinner(activeWinner === key ? null : key);
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ fontFamily: FONT, background: C.night }}>
      <Nav />

      <main style={{ background: C.night, minHeight: "100vh", paddingTop: 88, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* ── Page Header ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: 32 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <motion.button
                whileHover={{ x: -3 }}
                onClick={() => navigate("/")}
                style={{
                  background: "none", border: `1px solid ${C.nightBorder}`,
                  color: C.slateLight, borderRadius: 10, padding: "8px 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                ← New Search
              </motion.button>
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
              {/* ── AI Hero Recommendation ──────────────────────── */}
              <AIHero
                item={data.best_overall}
                query={data.query}
                results={results}
              />

              {/* ── Category Winners Strip ──────────────────────── */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 14,
                  marginBottom: 40,
                }}
              >
                {winners.map((w) => (
                  <CategoryWinnerCard
                    key={w.key}
                    {...w}
                    isActive={activeWinner === w.key}
                    onClick={() => handleWinnerClick(w.key)}
                  />
                ))}
              </motion.div>

              {/* ── Sort / Filter Bar ───────────────────────────── */}
              <motion.div
                ref={gridRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 12,
                  marginBottom: 24, paddingTop: 8,
                }}
              >
                <h2 style={{ color: C.pureWhite, fontSize: 22, fontWeight: 800, margin: 0 }}>
                  All Restaurants
                </h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SORT_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.key}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSortKey(opt.key)}
                      style={{
                        background: sortKey === opt.key ? C.brand : "rgba(255,255,255,0.04)",
                        border: `1px solid ${sortKey === opt.key ? C.brand : C.nightBorder}`,
                        color: sortKey === opt.key ? "#fff" : C.slateLight,
                        borderRadius: 10, padding: "7px 14px",
                        fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.2s",
                      }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* ── Results Grid ────────────────────────────────── */}
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
                <AnimatePresence mode="popLayout">
                  {sortedResults.map((item, index) => (
                    <RestaurantCard
                      key={item.restaurant + index}
                      item={item}
                      index={index}
                      badges={getBadges(item)}
                      onViewDeal={() => {
                        if (item.restaurant_url) window.open(item.restaurant_url, "_blank");
                      }}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* ── Quick Insight Footer ────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: 48,
                  background: C.nightCard,
                  border: `1px solid ${C.nightBorder}`,
                  borderRadius: 20,
                  padding: "28px 32px",
                  display: "flex", gap: 32, flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {[
                  { label: "Restaurants Found", value: results.length, icon: "🍽️" },
                  { label: "Price Range", value: cheapestPrice != null ? `${fmt(cheapestPrice)} – ${fmt(Math.max(...results.filter(r => r.price).map(r => r.price)))}` : "—", icon: "💰" },
                  { label: "Fastest Delivery", value: fastestTime != null ? `${fastestTime} min` : "—", icon: "⚡" },
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
            /* ── No Results State ────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", padding: "80px 0" }}
            >
              <div style={{ fontSize: 64, marginBottom: 20 }}>😕</div>
              <h2 style={{ color: C.pureWhite, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                No restaurants found for "{data.query}"
              </h2>
              <p style={{ color: C.slateLight, fontSize: 16, marginBottom: 28 }}>
                Try a different search term or check back in a moment.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/")}
                style={{
                  background: C.brand, color: "#fff", border: "none", borderRadius: 14,
                  padding: "14px 28px", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ← Try Another Search
              </motion.button>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}