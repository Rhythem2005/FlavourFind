import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { searchFood } from "../services/foodApi";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  brand: "#FF5C2B",
  brandLight: "#FF7A4E",
  brandMuted: "#FFF0EB",
  night: "#0D0D0F",
  nightSurface: "#141417",
  nightCard: "#1A1A1E",
  nightBorder: "#2A2A30",
  slate: "#6B7280",
  slateLight: "#9CA3AF",
  white: "#FFFFFF",
  success: "#22C55E",
  warning: "#F59E0B",
};

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SEARCH_RESULTS = [
  {
    name: "Butter Chicken + Garlic Naan",
    restaurant: "Spice Garden",
    image: "🍛",
    platforms: [
      { name: "Swiggy", price: 349, time: "28 min", rating: 4.6, offer: "20% off" },
      { name: "Zomato", price: 329, time: "35 min", rating: 4.5, offer: "Free delivery" },
      { name: "Magicpin", price: 359, time: "25 min", rating: 4.7, offer: "15% cashback" },
    ],
    aiPick: 1,
    aiNote: "Best value when factoring in delivery savings",
  },
  {
    name: "Margherita Pizza (Medium)",
    restaurant: "Pizza Republic",
    image: "🍕",
    platforms: [
      { name: "Swiggy", price: 449, time: "40 min", rating: 4.3, offer: null },
      { name: "Zomato", price: 399, time: "32 min", rating: 4.4, offer: "Buy 1 Get 1" },
      { name: "EatFit", price: 419, time: "45 min", rating: 4.2, offer: "Healthy choice" },
    ],
    aiPick: 1,
    aiNote: "BOGO deal cuts effective price to ₹200 per pizza",
  },
  {
    name: "Dragon Roll (8 pcs) + Miso Soup",
    restaurant: "Sakura Sushi",
    image: "🍱",
    platforms: [
      { name: "Swiggy", price: 699, time: "50 min", rating: 4.8, offer: "10% off" },
      { name: "Zomato", price: 679, time: "55 min", rating: 4.7, offer: null },
      { name: "DotPe", price: 649, time: "65 min", rating: 4.6, offer: "5% cashback" },
    ],
    aiPick: 0,
    aiNote: "Swiggy discount beats DotPe's cashback by ₹20",
  },
];

const AI_RECOMMENDATION = {
  query: "I want something healthy, under ₹400, that arrives in 30 minutes",
  result: {
    name: "Quinoa Power Bowl",
    restaurant: "The Green Fork",
    image: "🥗",
    platform: "Swiggy",
    price: 349,
    time: "22 min",
    rating: 4.7,
    calories: 410,
    protein: "28g",
    tags: ["Gluten-Free", "High Protein", "Chef's Pick"],
    reasoning: [
      "Matches your 30-minute delivery window",
      "₹51 below your budget",
      "Highest protein-per-rupee in your area",
      "Rated 4.7 by 2,400+ users this week",
    ],
  },
};

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-Time Price Intelligence",
    desc: "Prices refresh every 90 seconds across Swiggy, Zomato, Blinkit, and 12+ platforms. Never pay more than you should.",
  },
  {
    icon: "🤖",
    title: "AI Offer Decoding",
    desc: "Cashbacks, BOGO deals, and promo stacks are computed into a single 'effective price' so you can compare apples to apples.",
  },
  {
    icon: "🎯",
    title: "Preference Memory",
    desc: "FoodLens learns your spice tolerance, diet restrictions, and favourite cuisines over time — recommendations sharpen with every order.",
  },
  {
    icon: "📊",
    title: "Nutrition at a Glance",
    desc: "Macros, calories, and allergens surface alongside price. Eating well and eating smart aren't separate goals anymore.",
  },
  {
    icon: "🗺️",
    title: "Live Delivery Mapping",
    desc: "ETA predictions trained on 8M+ deliveries, not the platforms' own inflated estimates. Accurate to within 4 minutes.",
  },
  {
    icon: "🔔",
    title: "Deal Alerts",
    desc: "Set a dish you love, define your price ceiling, and get notified the moment a platform drops below it. Never miss a deal.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "Search",
    desc: "Type any dish, cuisine, or craving in plain language. Our parser understands 'something spicy under 300 bucks' just as well.",
    icon: "🔍",
  },
  {
    step: "Compare",
    desc: "FoodLens fetches live listings from every connected platform and normalises prices, offers, and ETAs into a single view.",
    icon: "⚖️",
  },
  {
    step: "Decide",
    desc: "Our AI highlights the best overall deal and explains why. One tap sends you straight to checkout on your chosen platform.",
    icon: "✅",
  },
];

// ─── Reusable Components ──────────────────────────────────────────────────────

const FadeUp = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Tag = ({ children }) => (
  <span style={{
    display: "inline-block",
    background: COLORS.brandMuted,
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "3px 10px",
    borderRadius: 999,
    textTransform: "uppercase",
  }}>
    {children}
  </span>
);

const PlatformBadge = ({ platform, isTop }) => (
  <span style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    background: isTop ? COLORS.brand : "rgba(255,255,255,0.06)",
    color: isTop ? "#fff" : COLORS.slateLight,
    border: isTop ? "none" : `1px solid ${COLORS.nightBorder}`,
    padding: "3px 10px",
    borderRadius: 999,
  }}>
    {isTop && <span style={{ fontSize: 9 }}>★ BEST</span>}
    {platform}
  </span>
);

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= full ? COLORS.warning : COLORS.nightBorder, fontSize: 11 }}>★</span>
      ))}
      <span style={{ color: COLORS.slateLight, fontSize: 12, marginLeft: 2 }}>{rating}</span>
    </span>
  );
};



// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const phrases = [
    "biryani under ₹300 in 30 mins",
    "healthy salad with high protein",
    "pizza with the best deal tonight",
    "sushi that arrives in under 45 mins",
  ];
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = phrases[phraseIdx.current];
      if (!deleting.current) {
        charIdx.current++;
        setTyped(current.slice(0, charIdx.current));
        if (charIdx.current === current.length) {
          deleting.current = true;
          setTimeout(tick, 1800);
          return;
        }
      } else {
        charIdx.current--;
        setTyped(current.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length;
        }
      }
      setTimeout(tick, deleting.current ? 45 : 72);
    };
    const t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchFood(query);
      navigate("/results", { state: response });
    } catch (err) {
      setError("Unable to fetch results. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  const floatingDishes = ["🍕", "🍜", "🍣", "🌮", "🍔", "🥗", "🍛", "🧆"];

  return (
    <section style={{
      minHeight: "100vh",
      background: COLORS.night,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "100px 24px 80px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "20%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 400,
        background: `radial-gradient(ellipse at center, ${COLORS.brand}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Floating dish emojis */}
      {floatingDishes.map((dish, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: [0, 0.35, 0.35, 0],
            y: [-20, -100, -180],
            x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 8)],
          }}
          transition={{
            duration: 6 + i * 0.7,
            repeat: Infinity,
            delay: i * 1.1,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            bottom: "15%",
            left: `${12 + i * 10}%`,
            fontSize: 28,
            pointerEvents: "none",
            filter: "blur(0.5px)",
          }}
        >{dish}</motion.div>
      ))}

      <div style={{ maxWidth: 760, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ marginBottom: 20 }}
        >
          <Tag>AI-Powered Food Discovery</Tag>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(38px, 6vw, 72px)",
            fontWeight: 900,
            color: COLORS.white,
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
            marginBottom: 20,
          }}
        >
          Find the best deal<br />
          <span style={{ color: COLORS.brand }}>on every meal.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{
            fontSize: 18, color: COLORS.slateLight,
            lineHeight: 1.65, marginBottom: 44,
            maxWidth: 540, margin: "0 auto 44px",
          }}
        >
          Compare prices, offers, and delivery times across every platform in one search. Let AI pick the winner for you.
        </motion.p>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Search Bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          style={{
            background: COLORS.nightCard,
            border: `1.5px solid ${COLORS.nightBorder}`,
            borderRadius: 18,
            padding: "6px 6px 6px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 620,
            margin: "0 auto 48px",
            boxShadow: `0 0 0 1px ${COLORS.brand}22, 0 20px 60px rgba(0,0,0,0.4)`,
          }}
        >
          <span style={{ fontSize: 20 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={typed + "▌"}
            style={{
              flex: 1, background: "transparent",
              border: "none", outline: "none",
              color: COLORS.white, fontSize: 16,
              fontFamily: "inherit",
              caretColor: COLORS.brand,
            }}
          />
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.04 } : {}}
            whileTap={!loading ? { scale: 0.96 } : {}}
            style={{
              background: COLORS.brand,
              color: "#fff", border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: loading ? 0.7 : 1,
            }}
          >{loading ? "Searching..." : "Search with AI →"}</motion.button>
        </motion.form>

        {/* Quick tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}
        >
          {["🍕 Pizza deals", "🍛 Biryani under ₹300", "🥗 Healthy under 500 cal", "🍣 Sushi near me"].map(t => (
            <motion.button
              key={t}
              type="button"
              whileHover={{ scale: 1.05, borderColor: COLORS.brand }}
              onClick={() => setQuery(t.split(" ").slice(1).join(" "))}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${COLORS.nightBorder}`,
                color: COLORS.slateLight, borderRadius: 999,
                padding: "7px 16px", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.white}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.slateLight}
            >{t}</motion.button>
          ))}
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          position: "absolute", bottom: 40,
          display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center",
        }}
      >
        {[
          ["14+", "Platforms connected"],
          ["3.2M+", "Dishes tracked"],
          ["₹180", "Avg. saved per order"],
          ["22 sec", "Avg. search time"],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.white, letterSpacing: "-0.03em" }}>{val}</div>
            <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
};

// ─── Product Explanation ──────────────────────────────────────────────────────
const ProductExplanation = () => (
  <section style={{ background: COLORS.nightSurface, padding: "100px 24px" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <Tag>What is FoodLens AI?</Tag>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 800, color: COLORS.white,
            marginTop: 16, letterSpacing: "-0.03em",
          }}>
            One search. Every platform. The best deal.
          </h2>
          <p style={{ color: COLORS.slateLight, fontSize: 17, maxWidth: 560, margin: "16px auto 0", lineHeight: 1.7 }}>
            FoodLens connects to every major delivery platform in real time, runs your search across all of them, decodes every active offer, and lets AI pick the option that genuinely saves you the most.
          </p>
        </div>
      </FadeUp>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
      }}>
        {[
          {
            emoji: "🤯",
            title: "The problem",
            desc: "Comparing food prices across Swiggy, Zomato, and 10 other apps is exhausting. Offers are buried, ETAs are inflated, and by the time you decide — the deal's expired.",
            accent: "#ef4444",
          },
          {
            emoji: "💡",
            title: "Our solution",
            desc: "A single search bar that fans out to every platform simultaneously, normalises all offers into their actual rupee value, and surfaces the top result in under 5 seconds.",
            accent: COLORS.brand,
          },
          {
            emoji: "🧠",
            title: "The AI edge",
            desc: "Beyond price, our model weighs your past preferences, restaurant reliability scores, and live delivery data to recommend the option that's right for you — not just the cheapest.",
            accent: "#8b5cf6",
          },
        ].map(({ emoji, title, desc, accent }) => (
          <FadeUp key={title}>
            <motion.div
              whileHover={{ y: -4 }}
              style={{
                background: COLORS.nightCard,
                border: `1px solid ${COLORS.nightBorder}`,
                borderTop: `3px solid ${accent}`,
                borderRadius: 16, padding: 32,
                height: "100%",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{emoji}</div>
              <h3 style={{ color: COLORS.white, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ color: COLORS.slateLight, fontSize: 15, lineHeight: 1.7, margin: 0 }}>{desc}</p>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

// ─── How It Works ─────────────────────────────────────────────────────────────
const HowItWorks = () => (
  <section style={{ background: COLORS.night, padding: "100px 24px" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <FadeUp style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <Tag>Process</Tag>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 800, color: COLORS.white,
            marginTop: 16, letterSpacing: "-0.03em",
          }}>Three steps to the perfect order</h2>
        </div>
      </FadeUp>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 0,
        position: "relative",
      }}>
        {HOW_IT_WORKS.map(({ step, desc, icon }, i) => (
          <FadeUp key={step} delay={i * 0.12}>
            <div style={{ padding: "32px 24px", position: "relative", textAlign: "center" }}>
              {i < HOW_IT_WORKS.length - 1 && (
                <div style={{
                  position: "absolute", top: 52, right: 0,
                  width: "50%", height: 1,
                  background: `linear-gradient(90deg, ${COLORS.nightBorder}, transparent)`,
                  display: "none",
                }} className="step-connector" />
              )}
              <motion.div
                whileHover={{ scale: 1.08 }}
                style={{
                  width: 72, height: 72,
                  background: `${COLORS.brand}18`,
                  border: `2px solid ${COLORS.brand}44`,
                  borderRadius: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, margin: "0 auto 20px",
                }}
              >{icon}</motion.div>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: COLORS.brand, color: "#fff",
                fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>{i + 1}</div>
              <h3 style={{ color: COLORS.white, fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{step}</h3>
              <p style={{ color: COLORS.slateLight, fontSize: 15, lineHeight: 1.7, margin: 0 }}>{desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const Features = () => (
  <section style={{ background: COLORS.nightSurface, padding: "100px 24px" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <Tag>Features</Tag>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 800, color: COLORS.white,
            marginTop: 16, letterSpacing: "-0.03em",
          }}>Built for people who eat smart</h2>
        </div>
      </FadeUp>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {FEATURES.map(({ icon, title, desc }, i) => (
          <FadeUp key={title} delay={i * 0.07}>
            <motion.div
              whileHover={{ y: -4, borderColor: `${COLORS.brand}55` }}
              style={{
                background: COLORS.nightCard,
                border: `1px solid ${COLORS.nightBorder}`,
                borderRadius: 16, padding: 28,
                transition: "border-color 0.25s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ color: COLORS.white, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ color: COLORS.slateLight, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{desc}</p>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

// ─── Search Results Showcase ──────────────────────────────────────────────────
const SearchShowcase = () => {
  const [active, setActive] = useState(0);
  const result = SEARCH_RESULTS[active];

  return (
    <section style={{ background: COLORS.night, padding: "100px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Tag>Live Example</Tag>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 800, color: COLORS.white,
              marginTop: 16, letterSpacing: "-0.03em",
            }}>See results across every platform</h2>
            <p style={{ color: COLORS.slateLight, fontSize: 16, marginTop: 12 }}>
              Pick a dish to see how FoodLens compares it live across platforms.
            </p>
          </div>
        </FadeUp>

        {/* Dish selector */}
        <FadeUp>
          <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", justifyContent: "center" }}>
            {SEARCH_RESULTS.map((r, i) => (
              <motion.button
                key={r.name}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setActive(i)}
                style={{
                  background: active === i ? COLORS.brand : COLORS.nightCard,
                  border: `1px solid ${active === i ? COLORS.brand : COLORS.nightBorder}`,
                  color: active === i ? "#fff" : COLORS.slateLight,
                  borderRadius: 10, padding: "10px 18px",
                  fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span>{r.image}</span>
                <span>{r.restaurant}</span>
              </motion.button>
            ))}
          </div>
        </FadeUp>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {/* Result header */}
            <div style={{
              background: COLORS.nightCard,
              border: `1px solid ${COLORS.nightBorder}`,
              borderRadius: 16, padding: "24px 28px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 48 }}>{result.image}</span>
              <div>
                <h3 style={{ color: COLORS.white, fontSize: 20, fontWeight: 700, margin: 0 }}>{result.name}</h3>
                <p style={{ color: COLORS.slateLight, fontSize: 14, margin: "4px 0 0" }}>{result.restaurant}</p>
              </div>
              <div style={{
                marginLeft: "auto",
                background: `${COLORS.brand}18`,
                border: `1px solid ${COLORS.brand}44`,
                borderRadius: 12, padding: "10px 16px",
              }}>
                <div style={{ fontSize: 11, color: COLORS.brand, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Verdict</div>
                <div style={{ color: COLORS.white, fontSize: 13, marginTop: 4, maxWidth: 220 }}>{result.aiNote}</div>
              </div>
            </div>

            {/* Platform rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.platforms.map((p, i) => {
                const isTop = i === result.aiPick;
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      background: isTop ? `${COLORS.brand}0D` : COLORS.nightCard,
                      border: `1.5px solid ${isTop ? COLORS.brand + "55" : COLORS.nightBorder}`,
                      borderRadius: 14, padding: "18px 24px",
                      display: "flex", alignItems: "center",
                      flexWrap: "wrap", gap: 16,
                    }}
                  >
                    <PlatformBadge platform={p.name} isTop={isTop} />

                    <div style={{ flex: 1, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ color: COLORS.white, fontSize: 22, fontWeight: 800 }}>₹{p.price}</div>
                        {p.offer && (
                          <div style={{ color: COLORS.success, fontSize: 12, fontWeight: 600 }}>✓ {p.offer}</div>
                        )}
                      </div>
                      <div>
                        <div style={{ color: COLORS.slateLight, fontSize: 12 }}>Delivery</div>
                        <div style={{ color: COLORS.white, fontSize: 15, fontWeight: 600 }}>🕐 {p.time}</div>
                      </div>
                      <div>
                        <div style={{ color: COLORS.slateLight, fontSize: 12 }}>Rating</div>
                        <StarRating rating={p.rating} />
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        background: isTop ? COLORS.brand : "transparent",
                        border: `1px solid ${isTop ? COLORS.brand : COLORS.nightBorder}`,
                        color: isTop ? "#fff" : COLORS.slateLight,
                        borderRadius: 9, padding: "9px 18px",
                        fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >{isTop ? "Order Now →" : "View Deal"}</motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

// ─── AI Recommendation Showcase ───────────────────────────────────────────────
const AIShowcase = () => {
  const { result, query } = AI_RECOMMENDATION;
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (inView) setTimeout(() => setVisible(true), 400);
  }, [inView]);

  return (
    <section ref={ref} style={{ background: COLORS.nightSurface, padding: "100px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <FadeUp>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Tag>AI Recommendation</Tag>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 800, color: COLORS.white,
              marginTop: 16, letterSpacing: "-0.03em",
            }}>Just describe what you want</h2>
          </div>
        </FadeUp>

        <div style={{
          background: COLORS.nightCard,
          border: `1px solid ${COLORS.nightBorder}`,
          borderRadius: 20, overflow: "hidden",
        }}>
          {/* Chat message */}
          <div style={{ padding: "28px 32px", borderBottom: `1px solid ${COLORS.nightBorder}` }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#6366f1", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>👤</div>
              <div style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${COLORS.nightBorder}`,
                borderRadius: 14, padding: "12px 18px",
                color: COLORS.white, fontSize: 16, lineHeight: 1.6,
              }}>
                {query}
              </div>
            </div>
          </div>

          {/* AI Response */}
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: COLORS.brand,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>🍽️</div>

              <AnimatePresence>
                {visible && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ flex: 1 }}
                  >
                    <div style={{
                      background: `${COLORS.brand}0F`,
                      border: `1.5px solid ${COLORS.brand}44`,
                      borderRadius: 16, overflow: "hidden",
                    }}>
                      {/* Result card */}
                      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.brand}22` }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 48 }}>{result.image}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                              {result.tags.map(t => <Tag key={t}>{t}</Tag>)}
                            </div>
                            <h3 style={{ color: COLORS.white, fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{result.name}</h3>
                            <p style={{ color: COLORS.slateLight, fontSize: 13, margin: 0 }}>{result.restaurant} · via {result.platform}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: COLORS.white, fontSize: 28, fontWeight: 900 }}>₹{result.price}</div>
                            <div style={{ color: COLORS.success, fontSize: 13, fontWeight: 600 }}>🕐 {result.time}</div>
                          </div>
                        </div>

                        {/* Nutrition quick stats */}
                        <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                          {[
                            { label: "Calories", val: result.calories },
                            { label: "Protein", val: result.protein },
                            { label: "Rating", val: `★ ${result.rating}` },
                          ].map(({ label, val }) => (
                            <div key={label} style={{
                              background: "rgba(255,255,255,0.05)",
                              border: `1px solid ${COLORS.nightBorder}`,
                              borderRadius: 10, padding: "8px 16px", textAlign: "center",
                            }}>
                              <div style={{ color: COLORS.slateLight, fontSize: 11 }}>{label}</div>
                              <div style={{ color: COLORS.white, fontSize: 16, fontWeight: 700 }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div style={{ padding: "18px 24px" }}>
                        <div style={{ color: COLORS.brand, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                          Why this pick
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {result.reasoning.map((r, i) => (
                            <motion.div
                              key={r}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                              style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                            >
                              <span style={{ color: COLORS.success, fontSize: 14, marginTop: 1 }}>✓</span>
                              <span style={{ color: COLORS.slateLight, fontSize: 14, lineHeight: 1.5 }}>{r}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Action */}
                      <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.brand}22`, display: "flex", gap: 12 }}>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            flex: 1, background: COLORS.brand, color: "#fff",
                            border: "none", borderRadius: 12,
                            padding: "12px", fontSize: 15, fontWeight: 700,
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >Order from Swiggy →</motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          style={{
                            background: "transparent",
                            border: `1px solid ${COLORS.nightBorder}`,
                            color: COLORS.slateLight,
                            borderRadius: 12, padding: "12px 18px",
                            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >Show alternatives</motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── CTA ──────────────────────────────────────────────────────────────────────
const CTA = () => (
  <section style={{ background: COLORS.night, padding: "100px 24px" }}>
    <FadeUp>
      <div style={{
        maxWidth: 700, margin: "0 auto", textAlign: "center",
        background: `linear-gradient(135deg, ${COLORS.brand}22 0%, ${COLORS.nightCard} 100%)`,
        border: `1px solid ${COLORS.brand}33`,
        borderRadius: 24, padding: "64px 40px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200,
          background: `radial-gradient(circle, ${COLORS.brand}22 0%, transparent 70%)`,
        }} />
        <span style={{ fontSize: 48 }}>🍽️</span>
        <h2 style={{
          color: COLORS.white, fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 800, letterSpacing: "-0.03em", marginTop: 16, marginBottom: 12,
        }}>Stop overpaying for food.</h2>
        <p style={{
          color: COLORS.slateLight, fontSize: 17, lineHeight: 1.7,
          maxWidth: 460, margin: "0 auto 36px",
        }}>
          Join 80,000+ users who save an average of ₹180 on every order. FoodLens is free to start.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: COLORS.brand, color: "#fff",
              border: "none", borderRadius: 12,
              padding: "14px 32px", fontSize: 16, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Start for Free →</motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            style={{
              background: "transparent",
              border: `1.5px solid ${COLORS.nightBorder}`,
              color: COLORS.slateLight, borderRadius: 12,
              padding: "14px 28px", fontSize: 16,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Watch 90-sec Demo</motion.button>
        </div>
        <p style={{ color: COLORS.slate, fontSize: 13, marginTop: 20 }}>
          No credit card required · Works across India
        </p>
      </div>
    </FadeUp>
  </section>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function FoodLensAI() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: COLORS.night }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${COLORS.night}; }
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
      <Nav />
      <Hero />
      <ProductExplanation />
      <HowItWorks />
      <Features />
      <SearchShowcase />
      <AIShowcase />
      <CTA />
      <Footer />
    </div>
  );
}