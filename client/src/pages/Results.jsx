import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

// ─── INJECT FONTS + GLOBAL STYLES ─────────────────────────────────────────────
const GlobalStyle = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      :root {
        --void: #08060A;
        --deep: #0E0B12;
        --surface: #141019;
        --card: #1A1520;
        --card2: #201A28;
        --rim: rgba(255,255,255,0.06);
        --rim2: rgba(255,255,255,0.11);
        --fire: #FF6B2C;
        --fire2: #FF9254;
        --cream: #FFF3E0;
        --muted: #8A7FA0;
        --faint: #4A4258;
        --green: #2DD87A;
        --gold: #FFD166;
        --purple: #B47FFF;
        --font-hero: 'Playfair Display', Georgia, serif;
        --font-ui: 'DM Sans', system-ui, sans-serif;
      }
      @keyframes steam {
        0%   { transform: translateY(0) scaleX(1) rotate(0deg);   opacity: 0; }
        15%  { opacity: 0.45; }
        80%  { opacity: 0.15; }
        100% { transform: translateY(-80px) scaleX(1.6) rotate(12deg); opacity: 0; }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes floatY {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px 2px rgba(255,107,44,0.25); }
        50%       { box-shadow: 0 0 40px 8px rgba(255,107,44,0.45); }
      }
      @keyframes rotateSlow {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes borderFlow {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .steam-particle {
        position: absolute;
        bottom: 0;
        width: 6px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        filter: blur(3px);
        animation: steam 3s ease-out infinite;
        pointer-events: none;
      }
      .shimmer-text {
        background: linear-gradient(90deg, #FF6B2C, #FF9254, #FFD166, #FF9254, #FF6B2C);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
      }
      .card-3d {
        transform-style: preserve-3d;
        transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease;
        will-change: transform;
      }
      .card-3d:hover {
        transform: translateY(-12px) rotateX(4deg) scale(1.015);
        box-shadow: 0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(255,107,44,0.15);
      }
      .winner-card-3d {
        transform-style: preserve-3d;
        transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
        will-change: transform;
      }
      .winner-card-3d:hover {
        transform: translateY(-8px) rotateY(-3deg) rotateX(2deg);
        box-shadow: 8px 24px 48px rgba(0,0,0,0.6);
      }
      .fire-btn {
        position: relative;
        overflow: hidden;
      }
      .fire-btn::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        background: linear-gradient(90deg, #FF6B2C, #FFD166, #FF6B2C);
        background-size: 200% 100%;
        animation: borderFlow 2s linear infinite;
        z-index: -1;
      }
      .fire-btn::after {
        content: '';
        position: absolute;
        inset: 2px;
        border-radius: calc(inherit - 2px);
        background: var(--void);
        z-index: -1;
      }
      .depth-layer {
        transform-style: preserve-3d;
      }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: var(--void); }
      ::-webkit-scrollbar-thumb { background: rgba(255,107,44,0.4); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,107,44,0.7); }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);
  return null;
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmt = (n) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "—");

const ratingColor = (r) => {
  if (r == null) return "#4A4258";
  if (r >= 4.2) return "#2DD87A";
  if (r >= 3.8) return "#FFD166";
  return "#FF6B2C";
};

const sortResults = (results, sortKey) => {
  const s = [...results];
  if (sortKey === "price_low")  return s.sort((a, b) => (a.price ?? 9999) - (b.price ?? 9999));
  if (sortKey === "price_high") return s.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  if (sortKey === "rating")     return s.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sortKey === "delivery")   return s.sort((a, b) => (a.delivery_time ?? 9999) - (b.delivery_time ?? 9999));
  return s;
};

const buildTitle = (data) => {
  const { intent, query } = data;
  if (!intent) return query;
  const parts = [];
  if (intent.food_search_term) parts.push(intent.food_search_term);
  if (intent.budget) parts.push(`under ₹${intent.budget}`);
  if (intent.group_size > 1) parts.push(`for ${intent.group_size}`);
  return parts.length > 0 ? parts.join(" ") : query;
};

// ─── MOUSE PARALLAX HOOK ──────────────────────────────────────────────────────
const useMouseParallax = (strength = 20) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });

  const handleMouseMove = useCallback((e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    x.set(((e.clientX - cx) / cx) * strength);
    y.set(((e.clientY - cy) / cy) * strength);
  }, [x, y, strength]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return { springX, springY };
};

// ─── STEAM PARTICLES ──────────────────────────────────────────────────────────
const SteamParticles = ({ count = 5, style = {} }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", pointerEvents: "none", overflow: "hidden", ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="steam-particle"
        style={{
          left: `${15 + i * 18}%`,
          animationDelay: `${i * 0.6}s`,
          animationDuration: `${2.5 + i * 0.4}s`,
          width: `${4 + Math.random() * 6}px`,
        }}
      />
    ))}
  </div>
);

// ─── RATING PILL ──────────────────────────────────────────────────────────────
const RatingPill = ({ rating, size = 13 }) => {
  if (rating == null) return <span style={{ color: "#4A4258", fontSize: size, fontFamily: "var(--font-ui)" }}>—</span>;
  const color = ratingColor(rating);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: `${color}18`,
      border: `1px solid ${color}35`,
      color, fontSize: size - 1, fontWeight: 700,
      padding: "3px 9px", borderRadius: 8,
      fontFamily: "var(--font-ui)",
    }}>
      ★ {rating.toFixed(1)}
    </span>
  );
};

// ─── CHIP ─────────────────────────────────────────────────────────────────────
const Chip = ({ children, color = "#FF6B2C", glowing = false, style = {} }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    padding: "4px 12px", borderRadius: 999,
    color, background: `${color}15`,
    border: `1px solid ${color}28`,
    textTransform: "uppercase", whiteSpace: "nowrap",
    fontFamily: "var(--font-ui)",
    boxShadow: glowing ? `0 0 14px ${color}35` : "none",
    ...style,
  }}>
    {children}
  </span>
);

// ─── INTENT BAR ───────────────────────────────────────────────────────────────
const IntentBar = ({ intent }) => {
  if (!intent) return null;
  const chips = [];
  if (intent.food_search_term) chips.push({ icon: "🍽️", label: intent.food_search_term });
  if (intent.budget) chips.push({ icon: "💰", label: `Under ₹${intent.budget}` });
  if (intent.group_size > 1) chips.push({ icon: "👥", label: `${intent.group_size} people` });
  if (intent.ranking_priority && intent.ranking_priority !== "balanced") {
    const map = { affordability: "By price", rating: "By rating", speed: "By speed", discounts: "Best deals", value_for_money: "Best value" };
    chips.push({ icon: "📊", label: map[intent.ranking_priority] || intent.ranking_priority });
  }
  if (intent.preferences?.length) {
    const icons = { discounts: "🏷️", "fast delivery": "⚡", "highly rated": "⭐", "late night": "🌙", healthy: "🥗", vegetarian: "🥬", "non-vegetarian": "🍖", "office lunch": "💼" };
    intent.preferences.slice(0, 2).forEach(p => chips.push({ icon: icons[p] || "✨", label: p }));
  }
  if (!chips.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
        marginBottom: 40,
        padding: "14px 20px",
        background: "rgba(255,107,44,0.05)",
        border: "1px solid rgba(255,107,44,0.15)",
        borderRadius: 16,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, color: "#FF6B2C",
        letterSpacing: "0.08em", textTransform: "uppercase",
        fontFamily: "var(--font-ui)", display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(255,107,44,0.2)", display: "inline-flex",
          alignItems: "center", justifyContent: "center", fontSize: 11,
        }}>🧠</span>
        AI parsed
      </span>
      <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
      {chips.map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.06 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
            color: "#8A7FA0", fontSize: 12, fontWeight: 500,
            padding: "5px 13px", borderRadius: 999,
            fontFamily: "var(--font-ui)",
          }}
        >
          {c.icon} {c.label}
        </motion.span>
      ))}
    </motion.div>
  );
};

// ─── CINEMATIC HERO BANNER ─────────────────────────────────────────────────────
const HeroBanner = ({ item, query, results, intent }) => {
  const { springX, springY } = useMouseParallax(8);
  const rotateX = useTransform(springY, val => -val * 0.3);
  const rotateY = useTransform(springX, val => val * 0.3);
  const bgX = useTransform(springX, val => val * 0.5);
  const bgY = useTransform(springY, val => val * 0.5);
  const reasons = item?.hero_explanation || item?.why_recommended || [];

  if (!item) return null;

  return (
    <motion.section
      style={{ perspective: 1000, marginBottom: 60 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 3D tilting container */}
      <motion.div
        style={{
          rotateX, rotateY,
          transformStyle: "preserve-3d",
          position: "relative",
          borderRadius: 32,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "var(--surface)",
          minHeight: 480,
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Deep parallax background */}
        <motion.div
          style={{
            x: bgX, y: bgY,
            position: "absolute", inset: "-30px",
            pointerEvents: "none",
          }}
        >
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt=""
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                opacity: 0.18, filter: "blur(2px) saturate(1.5)",
              }}
            />
          )}
        </motion.div>

        {/* Color wash overlays */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(255,107,44,0.18) 0%, transparent 50%, rgba(180,127,255,0.1) 100%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, var(--surface) 0%, rgba(14,11,18,0.7) 50%, var(--surface) 100%)",
          pointerEvents: "none",
        }} />

        {/* Animated orbs */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", top: -100, right: -100,
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,107,44,0.2) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{
            position: "absolute", bottom: -80, left: -80,
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(180,127,255,0.15) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Steam particles on thumbnail zone */}
        <SteamParticles count={6} style={{ left: "40%", width: "60%" }} />

        {/* Content layout */}
        <div style={{
          position: "relative", zIndex: 2,
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: 0, minHeight: 480,
        }}>

          {/* Left: text content */}
          <div style={{ padding: "52px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

            {/* Top badges */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}
            >
              <Chip color="#2DD87A" glowing style={{ fontSize: 11 }}>🏆 AI Top Pick</Chip>
              <Chip color="#8A7FA0">{results.length} restaurants compared</Chip>
              {item.discount && <Chip color="#FFD166">🏷️ {item.discount}</Chip>}
            </motion.div>

            {/* Restaurant name */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.16,1,0.3,1] }}
              style={{
                fontFamily: "var(--font-hero)",
                fontSize: "clamp(32px, 4.5vw, 56px)",
                fontWeight: 900, lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "#FFFFFF", marginBottom: 8,
              }}
            >
              {item.restaurant}
            </motion.h1>

            {item.cuisines && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ color: "#8A7FA0", fontSize: 14, marginBottom: 32, fontFamily: "var(--font-ui)" }}
              >
                {item.cuisines}
              </motion.p>
            )}

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
              style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}
            >
              {[
                { icon: "💰", label: "Price", value: fmt(item.price), accent: "#FF6B2C" },
                { icon: "⚡", label: "Delivery", value: `${item.delivery_time ?? "—"} min`, accent: "#FFD166" },
                { icon: "⭐", label: "Rating", value: item.rating != null ? `${item.rating.toFixed(1)}` : "—", accent: ratingColor(item.rating) },
              ].map(({ icon, label, value, accent }) => (
                <div key={label} style={{
                  padding: "14px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  backdropFilter: "blur(12px)",
                  minWidth: 100,
                }}>
                  <div style={{ fontSize: 10, color: "#4A4258", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-ui)" }}>
                    {icon} {label}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-hero)",
                    fontSize: "clamp(18px, 2.5vw, 26px)",
                    fontWeight: 800, color: accent, lineHeight: 1,
                  }}>{value}</div>
                </div>
              ))}
            </motion.div>

            {/* Why recommended */}
            {reasons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.56 }}
                style={{
                  background: "rgba(255,107,44,0.06)",
                  border: "1px solid rgba(255,107,44,0.2)",
                  borderRadius: 16, padding: "16px 20px", marginBottom: 32,
                  maxWidth: 520,
                }}
              >
                <div style={{ fontSize: 10, color: "#FF6B2C", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "var(--font-ui)" }}>
                  🧠 Why AI picked this
                </div>
                {reasons.slice(0, 3).map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.64 + i * 0.08 }}
                    style={{ display: "flex", gap: 10, marginBottom: i < reasons.length - 1 ? 7 : 0, alignItems: "flex-start" }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: "rgba(45,216,122,0.15)", color: "#2DD87A",
                      fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 2,
                    }}>✓</span>
                    <span style={{ color: "#8A7FA0", fontSize: 13, lineHeight: 1.6, fontFamily: "var(--font-ui)" }}>{r}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            >
              <motion.a
                href={item.restaurant_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="fire-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: "linear-gradient(135deg, #FF6B2C, #FF9254)",
                  color: "#fff", borderRadius: 14, padding: "15px 28px",
                  fontSize: 15, fontWeight: 700, textDecoration: "none",
                  fontFamily: "var(--font-ui)", letterSpacing: "0.01em",
                  boxShadow: "0 8px 32px rgba(255,107,44,0.5)",
                  animation: "pulseGlow 3s ease-in-out infinite",
                }}
              >
                Order on {item.platform}
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: 18 }}
                >→</motion.span>
              </motion.a>
            </motion.div>
          </div>

          {/* Right: floating image card */}
          {item.thumbnail && (
            <div style={{ padding: "40px 48px 40px 0", display: "flex", alignItems: "center" }}>
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 280, height: 320,
                  borderRadius: 24, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(255,107,44,0.2)",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <img
                  src={item.thumbnail}
                  alt={item.restaurant}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(8,6,10,0.8) 0%, transparent 50%)",
                }} />
                <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                  <RatingPill rating={item.rating} size={13} />
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
};

// ─── WINNER SHELF (horizontal scroll) ────────────────────────────────────────
const WINNER_CONFIG = [
  { key: "best_overall", icon: "🏆", label: "Best Overall", accent: "#FF6B2C" },
  { key: "cheapest",     icon: "💰", label: "Cheapest",     accent: "#2DD87A" },
  { key: "fastest",      icon: "⚡", label: "Fastest",      accent: "#FFD166" },
  { key: "highest_rated",icon: "⭐", label: "Top Rated",    accent: "#B47FFF" },
];

const WinnerCard = ({ config, item, isActive, onClick }) => {
  const { icon, label, accent } = config;

  return (
    <motion.button
      type="button"
      className="winner-card-3d"
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      style={{
        background: isActive
          ? `linear-gradient(145deg, ${accent}20, ${accent}08)`
          : "linear-gradient(145deg, var(--card), var(--surface))",
        border: `1px solid ${isActive ? accent + "45" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 22, padding: "22px 24px",
        cursor: "pointer", fontFamily: "var(--font-ui)",
        textAlign: "left", width: 230, flexShrink: 0,
        outline: "none",
        boxShadow: isActive ? `0 8px 32px ${accent}20` : "0 4px 20px rgba(0,0,0,0.4)",
        transition: "background 0.3s, border-color 0.3s, box-shadow 0.3s",
        position: "relative", overflow: "hidden",
      }}
    >
      {isActive && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
          style={{
            position: "absolute", top: 0, left: 0,
            width: "40%", height: "100%",
            background: `linear-gradient(90deg, transparent, ${accent}18, transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${accent}18`, border: `1px solid ${accent}25`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>

      {item ? (
        <>
          <div style={{
            color: "#FFFFFF", fontSize: 15, fontWeight: 700,
            marginBottom: 10, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "var(--font-hero)",
          }}>
            {item.restaurant}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: accent, fontSize: 18, fontWeight: 800, fontFamily: "var(--font-hero)" }}>
              {fmt(item.price)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#4A4258", fontSize: 12 }}>⚡ {item.delivery_time ?? "—"} min</span>
              <RatingPill rating={item.rating} size={10} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: "#4A4258", fontSize: 13 }}>No data</div>
      )}
    </motion.button>
  );
};

const WinnerShelf = ({ data, activeWinner, onWinnerClick }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.2 }}
    style={{ marginBottom: 60 }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <span style={{ color: "#FF6B2C", fontSize: 22 }}>🎯</span>
      <h2 style={{
        fontFamily: "var(--font-hero)",
        fontSize: 26, fontWeight: 800, color: "#FFFFFF",
        letterSpacing: "-0.02em",
      }}>Category Winners</h2>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)", marginLeft: 8 }} />
    </div>
    <div style={{
      display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8,
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      {WINNER_CONFIG.map((config) => (
        <WinnerCard
          key={config.key}
          config={config}
          item={data[config.key]}
          isActive={activeWinner === config.key}
          onClick={() => onWinnerClick(config.key)}
        />
      ))}
    </div>
  </motion.div>
);

// ─── SORT TABS ────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: "relevance",  label: "Best Match", icon: "✨" },
  { key: "price_low",  label: "Cheapest",   icon: "💰" },
  { key: "price_high", label: "Priciest",   icon: "👑" },
  { key: "rating",     label: "Top Rated",  icon: "⭐" },
  { key: "delivery",   label: "Fastest",    icon: "⚡" },
];

const SortBar = ({ sortKey, setSortKey, count }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.25 }}
    style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 14, marginBottom: 32,
    }}
  >
    <h2 style={{
      fontFamily: "var(--font-hero)", fontSize: "clamp(22px, 3vw, 30px)",
      fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em",
    }}>
      All Spots <span style={{ color: "#4A4258", fontSize: "0.55em", fontWeight: 400, fontFamily: "var(--font-ui)" }}>({count})</span>
    </h2>

    <div style={{
      display: "flex", gap: 4,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: 4,
    }}>
      {SORT_OPTIONS.map((opt) => (
        <motion.button
          key={opt.key}
          type="button"
          onClick={() => setSortKey(opt.key)}
          whileTap={{ scale: 0.94 }}
          style={{
            background: sortKey === opt.key ? "linear-gradient(135deg, #FF6B2C, #FF9254)" : "transparent",
            border: "none", borderRadius: 10,
            color: sortKey === opt.key ? "#fff" : "#4A4258",
            padding: "8px 16px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "var(--font-ui)",
            transition: "all 0.2s",
            boxShadow: sortKey === opt.key ? "0 4px 16px rgba(255,107,44,0.4)" : "none",
            letterSpacing: "0.01em",
          }}
        >
          {opt.icon} {opt.label}
        </motion.button>
      ))}
    </div>
  </motion.div>
);

// ─── RESTAURANT CARD (full 3D) ────────────────────────────────────────────────
const RestaurantCard = ({ item, index, badges = [], onViewDeal }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const hasThumbnail = item.thumbnail && !imgError;
  const reasons = item.why_recommended || [];

  return (
    <motion.div
      className="card-3d"
      variants={{
        hidden: { opacity: 0, y: 40, rotateX: 8 },
        visible: {
          opacity: 1, y: 0, rotateX: 0,
          transition: { delay: index * 0.06, duration: 0.65, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      style={{
        background: "linear-gradient(160deg, var(--card) 0%, var(--surface) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24, overflow: "hidden",
        cursor: "pointer", display: "flex", flexDirection: "column",
        position: "relative",
      }}
      onClick={onViewDeal}
    >
      {/* Image zone */}
      <div style={{ position: "relative", height: 188, overflow: "hidden", background: "var(--deep)" }}>
        {hasThumbnail ? (
          <motion.img
            src={item.thumbnail}
            alt={item.restaurant}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: imgLoaded ? 1 : 1.12, opacity: imgLoaded ? 1 : 0 }}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.6 }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #1A1520, #201A28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 56, opacity: 0.2,
          }}>🍽️</div>
        )}

        {/* Gradient overlays */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(20,16,25,1) 0%, transparent 55%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(20,16,25,0.4) 0%, transparent 100%)",
        }} />

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {badges.map((b, i) => (
              <Chip key={i} color={b.color} glowing={i === 0}
                style={{ fontSize: 9, backdropFilter: "blur(12px)" }}>
                {b.icon} {b.label}
              </Chip>
            ))}
          </div>
        )}

        {/* Discount */}
        {item.discount && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(45,216,122,0.9)", backdropFilter: "blur(8px)",
            color: "#08060A", fontSize: 10, fontWeight: 800,
            padding: "4px 10px", borderRadius: 8,
            fontFamily: "var(--font-ui)", letterSpacing: "0.04em",
          }}>
            {item.discount}
          </div>
        )}

        {/* Rating */}
        <div style={{ position: "absolute", bottom: 12, right: 12 }}>
          <RatingPill rating={item.rating} size={12} />
        </div>

        {/* Platform badge bottom-left */}
        <div style={{ position: "absolute", bottom: 12, left: 12 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: "#FF6B2C",
            background: "rgba(255,107,44,0.15)", border: "1px solid rgba(255,107,44,0.3)",
            padding: "3px 9px", borderRadius: 6, letterSpacing: "0.05em", textTransform: "uppercase",
            fontFamily: "var(--font-ui)",
          }}>{item.platform}</span>
        </div>

        <SteamParticles count={3} />
      </div>

      {/* Card body */}
      <div style={{ padding: "20px 22px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          color: "#FFFFFF", fontSize: 17, fontWeight: 700,
          margin: "0 0 4px", lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "var(--font-hero)",
        }}>
          {item.restaurant}
        </h3>

        {item.cuisines && (
          <p style={{
            color: "#4A4258", fontSize: 12, margin: "0 0 18px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "var(--font-ui)",
          }}>
            {item.cuisines}
          </p>
        )}

        <div style={{ marginTop: "auto" }}>
          {/* Price + delivery tile */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8, marginBottom: 16,
          }}>
            <div style={{
              background: "rgba(255,107,44,0.08)", border: "1px solid rgba(255,107,44,0.15)",
              borderRadius: 12, padding: "10px 14px",
            }}>
              <div style={{ fontSize: 9, color: "#4A4258", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4, fontFamily: "var(--font-ui)" }}>Price for 2</div>
              <div style={{ fontFamily: "var(--font-hero)", fontSize: 20, fontWeight: 800, color: "#FF6B2C", lineHeight: 1 }}>{fmt(item.price)}</div>
            </div>
            <div style={{
              background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.15)",
              borderRadius: 12, padding: "10px 14px",
            }}>
              <div style={{ fontSize: 9, color: "#4A4258", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4, fontFamily: "var(--font-ui)" }}>Delivery</div>
              <div style={{ fontFamily: "var(--font-hero)", fontSize: 20, fontWeight: 800, color: "#FFD166", lineHeight: 1 }}>
                {item.delivery_time ?? "—"}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 3, fontFamily: "var(--font-ui)" }}>min</span>
              </div>
            </div>
          </div>

          {/* Why recommended */}
          {reasons.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <motion.button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowReasons(v => !v); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", background: showReasons ? "rgba(255,107,44,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${showReasons ? "rgba(255,107,44,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 10, padding: "9px 14px",
                  color: showReasons ? "#FF6B2C" : "#4A4258",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-ui)", letterSpacing: "0.03em",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.2s", textTransform: "uppercase",
                }}
              >
                <span>🧠</span>
                <span style={{ flex: 1, textAlign: "left" }}>{showReasons ? "Hide reasons" : "Why recommended"}</span>
                <motion.span animate={{ rotate: showReasons ? 180 : 0 }} style={{ fontSize: 9 }}>▼</motion.span>
              </motion.button>

              <AnimatePresence>
                {showReasons && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{
                      marginTop: 8, padding: "12px 14px",
                      background: "rgba(255,107,44,0.05)", borderRadius: 10,
                      border: "1px solid rgba(255,107,44,0.12)",
                    }}>
                      {reasons.map((r, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 8, alignItems: "flex-start",
                          marginBottom: i < reasons.length - 1 ? 6 : 0,
                        }}>
                          <span style={{
                            width: 14, height: 14, borderRadius: "50%",
                            background: "rgba(45,216,122,0.15)", color: "#2DD87A",
                            fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, marginTop: 2,
                          }}>✓</span>
                          <span style={{ color: "#8A7FA0", fontSize: 12, lineHeight: 1.6, fontFamily: "var(--font-ui)" }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* CTA */}
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewDeal?.(); }}
            whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(255,107,44,0.45)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #FF6B2C, #FF9254)",
              border: "none", borderRadius: 12,
              color: "#fff", padding: "12px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-ui)", letterSpacing: "0.02em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(255,107,44,0.3)",
            }}
          >
            Order Now →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── INSIGHT FOOTER ───────────────────────────────────────────────────────────
const InsightFooter = ({ results, cheapestPrice, fastestTime, highestRating }) => (
  <motion.section
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    style={{ marginTop: 72 }}
  >
    <div style={{
      position: "relative", overflow: "hidden",
      borderRadius: 28, padding: "48px 52px",
      background: "linear-gradient(135deg, #1A1520 0%, #0E0B12 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    }}>
      {/* Accent orb */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,44,0.15) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{ marginBottom: 36 }}>
        <p style={{ color: "#FF6B2C", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "var(--font-ui)" }}>
          📊 Quick Summary
        </p>
        <h3 style={{ fontFamily: "var(--font-hero)", fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
          Here's what we found
        </h3>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16, position: "relative", zIndex: 1,
      }}>
        {[
          { icon: "🍽️", label: "Total Spots", value: results.length, accent: "#FF6B2C" },
          {
            icon: "💰", label: "Price Range", accent: "#2DD87A",
            value: cheapestPrice != null
              ? `${fmt(cheapestPrice)} – ${fmt(Math.max(...results.filter(r => r.price).map(r => r.price)))}`
              : "—",
          },
          { icon: "⚡", label: "Fastest", value: fastestTime != null ? `${fastestTime} min` : "—", accent: "#FFD166" },
          { icon: "⭐", label: "Best Rating", value: highestRating != null ? `${highestRating.toFixed(1)} ★` : "—", accent: "#B47FFF" },
        ].map(({ icon, label, value, accent }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            whileHover={{ y: -4, scale: 1.03 }}
            style={{
              background: `${accent}0C`,
              border: `1px solid ${accent}20`,
              borderRadius: 18, padding: "24px 22px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
            <div style={{
              fontFamily: "var(--font-hero)", fontSize: 22, fontWeight: 800,
              color: accent, marginBottom: 6, lineHeight: 1,
            }}>{value}</div>
            <div style={{
              color: "#4A4258", fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.07em", fontWeight: 700, fontFamily: "var(--font-ui)",
            }}>{label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.section>
);

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = ({ navigate }) => (
  <div style={{
    minHeight: "100vh", background: "var(--void)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-ui)",
  }}>
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ textAlign: "center", maxWidth: 520, padding: "0 32px" }}
    >
      <motion.div
        animate={{ y: [0, -16, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ fontSize: 100, marginBottom: 32, display: "block" }}
      >🔍</motion.div>
      <h1 style={{
        fontFamily: "var(--font-hero)", color: "#FFFFFF",
        fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900,
        marginBottom: 16, letterSpacing: "-0.03em",
      }}>
        Nothing here yet
      </h1>
      <p style={{ color: "#8A7FA0", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
        Search for any dish to discover the best restaurants across Zomato & Swiggy, ranked by AI.
      </p>
      <motion.button
        whileHover={{ scale: 1.07, boxShadow: "0 12px 40px rgba(255,107,44,0.55)" }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/")}
        style={{
          background: "linear-gradient(135deg, #FF6B2C, #FF9254)",
          color: "#fff", border: "none", borderRadius: 16,
          padding: "18px 42px", fontSize: 16, fontWeight: 700,
          cursor: "pointer", fontFamily: "var(--font-ui)",
          boxShadow: "0 8px 32px rgba(255,107,44,0.4)",
          letterSpacing: "0.01em",
        }}
      >
        ← Start Searching
      </motion.button>
    </motion.div>
  </div>
);

// ─── NO RESULTS STATE ─────────────────────────────────────────────────────────
const NoResultsState = ({ query, navigate }) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ textAlign: "center", padding: "100px 0 80px" }}
  >
    <motion.div
      animate={{ rotate: [-5, 5, -5, 0] }}
      transition={{ duration: 0.7, delay: 0.5 }}
      style={{ fontSize: 80, marginBottom: 28 }}
    >😕</motion.div>
    <h2 style={{
      fontFamily: "var(--font-hero)", color: "#FFFFFF",
      fontSize: 34, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em",
    }}>
      No results for "{query}"
    </h2>
    <p style={{ color: "#8A7FA0", fontSize: 16, marginBottom: 40, lineHeight: 1.7, fontFamily: "var(--font-ui)" }}>
      Try a different dish or check back shortly — we search live across Zomato & Swiggy.
    </p>
    <motion.button
      whileHover={{ scale: 1.06, boxShadow: "0 10px 36px rgba(255,107,44,0.5)" }}
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate("/")}
      style={{
        background: "linear-gradient(135deg, #FF6B2C, #FF9254)",
        color: "#fff", border: "none", borderRadius: 14,
        padding: "16px 34px", fontSize: 15, fontWeight: 700,
        cursor: "pointer", fontFamily: "var(--font-ui)",
        boxShadow: "0 6px 28px rgba(255,107,44,0.4)",
      }}
    >
      ← Try Another Search
    </motion.button>
  </motion.div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;
  const [sortKey, setSortKey] = useState("relevance");
  const [activeWinner, setActiveWinner] = useState(null);
  const gridRef = useRef(null);
  const { scrollY } = useScroll();

  // Scroll-based parallax for page header
  const headerY = useTransform(scrollY, [0, 300], [0, -40]);
  const headerOpacity = useTransform(scrollY, [0, 200], [1, 0.6]);

  if (!data || !data.query) {
    return (
      <>
        <GlobalStyle />
        <div style={{ background: "var(--void)", fontFamily: "var(--font-ui)" }}>
          <Nav />
          <EmptyState navigate={navigate} />
          <Footer />
        </div>
      </>
    );
  }

  const results = data.results || [];
  const sortedResults = sortResults(results, sortKey);
  const hasResults = results.length > 0;
  const intent = data.intent || null;
  const smartTitle = buildTitle(data);

  const cheapestPrice = results.reduce((m, r) => r.price != null && (m == null || r.price < m) ? r.price : m, null);
  const fastestTime   = results.reduce((m, r) => r.delivery_time != null && (m == null || r.delivery_time < m) ? r.delivery_time : m, null);
  const highestRating = results.reduce((m, r) => r.rating != null && (m == null || r.rating > m) ? r.rating : m, null);

  const getBadges = (item) => {
    const b = [];
    if (data.best_overall   && item.restaurant === data.best_overall.restaurant)   b.push({ icon: "🏆", label: "Best",      color: "#FF6B2C" });
    if (data.cheapest       && item.restaurant === data.cheapest.restaurant)       b.push({ icon: "💰", label: "Cheapest",  color: "#2DD87A" });
    if (data.fastest        && item.restaurant === data.fastest.restaurant)        b.push({ icon: "⚡", label: "Fastest",   color: "#FFD166" });
    if (data.highest_rated  && item.restaurant === data.highest_rated.restaurant)  b.push({ icon: "⭐", label: "Top Rated", color: "#B47FFF" });
    return b;
  };

  const handleWinnerClick = (key) => {
    setActiveWinner(prev => prev === key ? null : key);
    if (gridRef.current) gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <GlobalStyle />
      <div style={{
        background: "var(--void)", minHeight: "100vh",
        fontFamily: "var(--font-ui)",
        // subtle noise texture via SVG
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
      }}>
        <Nav />

        {/* Fixed glow vignette */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,107,44,0.06) 0%, transparent 60%)",
        }} />

        <main style={{ position: "relative", zIndex: 1, paddingTop: 88, paddingBottom: 120 }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px" }}>

            {/* ── Page Header ── */}
            <motion.div
              style={{ y: headerY, opacity: headerOpacity, marginBottom: 40 }}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Breadcrumb nav */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
                <motion.button
                  onClick={() => navigate("/")}
                  whileHover={{ x: -5, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "#8A7FA0", borderRadius: 12,
                    padding: "9px 18px", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-ui)",
                    display: "flex", alignItems: "center", gap: 6,
                    backdropFilter: "blur(8px)", transition: "color 0.2s",
                  }}
                >
                  ← New Search
                </motion.button>
                <Chip color="#FF6B2C" glowing style={{ fontSize: 10 }}>⚡ AI Powered</Chip>
                {hasResults && (
                  <span style={{ color: "#4A4258", fontSize: 13, fontFamily: "var(--font-ui)" }}>
                    {results.length} restaurants found
                  </span>
                )}
              </div>

              {/* Main headline */}
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    fontSize: 12, fontWeight: 700, color: "#FF6B2C",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    marginBottom: 12, fontFamily: "var(--font-ui)",
                  }}
                >
                  🔥 AI-Ranked Results
                </motion.p>
                <h1 style={{
                  fontFamily: "var(--font-hero)",
                  fontSize: "clamp(40px, 6vw, 72px)",
                  fontWeight: 900, lineHeight: 1.0,
                  letterSpacing: "-0.04em", margin: 0,
                  color: "#FFFFFF",
                }}>
                  Best{" "}
                  <span className="shimmer-text">{smartTitle}</span>
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>near you</span>
                </h1>
              </div>
            </motion.div>

            {/* ── Intent bar ── */}
            <IntentBar intent={intent} />

            {hasResults ? (
              <>
                {/* ── Hero Banner ── */}
                <HeroBanner
                  item={data.best_overall}
                  query={data.query}
                  results={results}
                  intent={intent}
                />

                {/* ── Winner Shelf ── */}
                <WinnerShelf
                  data={data}
                  activeWinner={activeWinner}
                  onWinnerClick={handleWinnerClick}
                />

                {/* ── Sort Bar ── */}
                <div ref={gridRef}>
                  <SortBar sortKey={sortKey} setSortKey={setSortKey} count={sortedResults.length} />
                </div>

                {/* ── Restaurant Grid ── */}
                <motion.div
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                  initial="hidden"
                  animate="visible"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 24,
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

                {/* ── Insight Footer ── */}
                <InsightFooter
                  results={results}
                  cheapestPrice={cheapestPrice}
                  fastestTime={fastestTime}
                  highestRating={highestRating}
                />
              </>
            ) : (
              <NoResultsState query={data.query} navigate={navigate} />
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}