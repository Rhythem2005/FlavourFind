import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { searchFood } from "../services/foodApi";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:        "#080810",
  bgSurf:    "#0E0E1A",
  bgCard:    "#12121F",
  border:    "#1E1E30",
  borderHi:  "#2E2E48",
  brand:     "#FF4D1A",
  brandDim:  "#FF4D1A22",
  amber:     "#FF8C00",
  amberDim:  "#FF8C0018",
  cream:     "#F5F0E8",
  creamMid:  "#B8B2A8",
  creamDim:  "#F5F0E820",
  slate:     "#7A7A9A",
  success:   "#22C55E",
  white:     "#FFFFFF",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
`;

// ─── Search examples ──────────────────────────────────────────────────────────
const EXAMPLES = [
  "cheap biryani under ₹200",
  "best pizza near me",
  "food for 4 people under ₹1000",
  "late night burgers with good ratings",
  "hyderabadi food, something spicy",
  "quick momos under 30 mins",
];

// ─── Comparison data ──────────────────────────────────────────────────────────
const DISHES = [
  {
    query: "Chicken Biryani",
    emoji: "🍛",
    options: [
      { name: "Behrouz Biryani", price: 319, time: 28, rating: 4.6, tag: "Best match", tagColor: T.brand },
      { name: "Paradise Restaurant", price: 289, time: 35, rating: 4.4, tag: "Cheapest", tagColor: T.amber },
      { name: "Dum Pukht Biryani", price: 349, time: 22, rating: 4.7, tag: "Fastest", tagColor: T.success },
    ],
  },
  {
    query: "Margherita Pizza",
    emoji: "🍕",
    options: [
      { name: "La Pino'z Pizza", price: 249, time: 30, rating: 4.3, tag: "Best value", tagColor: T.brand },
      { name: "Pizza Hut", price: 299, time: 38, rating: 4.2, tag: "Discount active", tagColor: T.amber },
      { name: "Domino's", price: 279, time: 25, rating: 4.4, tag: "Fastest", tagColor: T.success },
    ],
  },
  {
    query: "Chicken Burger",
    emoji: "🍔",
    options: [
      { name: "Burger Singh", price: 199, time: 24, rating: 4.5, tag: "AI pick", tagColor: T.brand },
      { name: "McDonald's", price: 179, time: 20, rating: 4.2, tag: "Cheapest", tagColor: T.amber },
      { name: "Wow! Momo", price: 219, time: 18, rating: 4.6, tag: "Top rated", tagColor: T.success },
    ],
  },
];

// ─── AI flow steps ────────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { label: "Natural query", value: '"cheap biryani under ₹200"', color: T.cream },
  { label: "Intent parsed", value: "food: biryani · budget: ₹200 · priority: price", color: T.amber },
  { label: "Restaurants scored", value: "47 matched · 12 relevant · 3 optimal", color: T.brand },
  { label: "Top pick", value: "Behrouz Biryani · ₹189 · 4.6★ · 28 min", color: T.success },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Pill = ({ children, color = T.brand }) => (
  <span style={{
    display: "inline-block",
    background: color + "18",
    color,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.05em",
    padding: "3px 10px",
    borderRadius: 999,
    border: `1px solid ${color}30`,
    fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  }}>{children}</span>
);

const Fade = ({ children, delay = 0, y = 20 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  );
};

// ─── Aperture / Lens bg ────────────────────────────────────────────────────────
const Aperture = ({ active }) => {
  const hue = active ? "255, 77, 26" : "255, 140, 0";
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
    }}>
      <motion.div
        animate={{ scale: active ? 1.08 : 1, opacity: active ? 1 : 0.6 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 720, height: 720,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(${hue}, 0.12) 0%, rgba(${hue}, 0.04) 40%, transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ rotate: active ? 15 : 0, opacity: active ? 0.15 : 0.07 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500, height: 500,
          borderRadius: "50%",
          border: `1px solid ${T.brand}`,
        }}
      />
      <motion.div
        animate={{ rotate: active ? -10 : 0, opacity: active ? 0.1 : 0.05 }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 640, height: 640,
          borderRadius: "50%",
          border: `1px solid ${T.amber}`,
        }}
      />
    </div>
  );
};

// ─── HERO ─────────────────────────────────────────────────────────────────────
const Hero = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const exIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let t;
    const tick = () => {
      if (focused) return;
      const cur = EXAMPLES[exIdx.current];
      if (!deleting.current) {
        charIdx.current++;
        setTyped(cur.slice(0, charIdx.current));
        if (charIdx.current === cur.length) {
          deleting.current = true;
          t = setTimeout(tick, 2200);
          return;
        }
      } else {
        charIdx.current--;
        setTyped(cur.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          exIdx.current = (exIdx.current + 1) % EXAMPLES.length;
        }
      }
      t = setTimeout(tick, deleting.current ? 38 : 65);
    };
    t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, [focused]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) { inputRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await searchFood(q);
      navigate("/results", { state: res });
    } catch {
      setError("Search failed — please try again.");
      setLoading(false);
    }
  };

  const fillQuery = (val) => {
    setQuery(val);
    inputRef.current?.focus();
  };

  const chips = ["🍛 cheap biryani", "🍕 pizza deals", "🍔 best burgers", "🌙 late night food"];

  return (
    <section style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "120px 24px 100px",
      position: "relative", overflow: "hidden",
    }}>
      <Aperture active={focused || loading} />

      <div style={{ maxWidth: 680, width: "100%", textAlign: "center", position: "relative", zIndex: 2 }}>

        {/* Eyebrow */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Pill color={T.amber}>AI food discovery · Delhi</Pill>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(44px, 7vw, 82px)",
            fontWeight: 800,
            color: T.cream,
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            margin: "20px 0 16px",
          }}
        >
          Describe your<br />
          <span style={{ color: T.brand }}>craving.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 17, color: T.slate,
            lineHeight: 1.65, marginBottom: 40,
          }}
        >
          FoodLens reads your query, finds every matching restaurant in Delhi, and ranks them by what actually matters to you.
        </motion.p>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginBottom: 20 }}
        >
          <motion.div
            animate={{ borderColor: focused ? T.brand + "88" : T.border }}
            transition={{ duration: 0.3 }}
            style={{
              background: T.bgCard,
              border: `1.5px solid ${T.border}`,
              borderRadius: 20,
              padding: "6px 6px 6px 22px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: focused ? `0 0 0 4px ${T.brand}12` : "0 20px 60px rgba(0,0,0,0.5)",
              transition: "box-shadow 0.3s",
            }}
          >
            <span style={{ fontSize: 18, opacity: 0.6 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={focused ? "" : typed + "▌"}
              style={{
                flex: 1, background: "transparent",
                border: "none", outline: "none",
                color: T.cream, fontSize: 16,
                fontFamily: "Inter, sans-serif",
                caretColor: T.brand,
                minWidth: 0,
              }}
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.03 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              style={{
                background: loading ? T.border : T.brand,
                color: T.white, border: "none",
                borderRadius: 14, padding: "13px 26px",
                fontSize: 15, fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >{loading ? "Searching…" : "Find restaurants →"}</motion.button>
          </motion.div>
        </motion.form>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: "#ef444418", border: "1px solid #ef444440",
                color: "#fca5a5", padding: "10px 16px", borderRadius: 12,
                fontSize: 14, fontFamily: "Inter, sans-serif", marginBottom: 16,
              }}
            >{error}</motion.div>
          )}
        </AnimatePresence>

        {/* Chips */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}
        >
          {chips.map(c => (
            <motion.button key={c} type="button"
              whileHover={{ borderColor: T.brand + "66", color: T.cream }}
              onClick={() => fillQuery(c.split(" ").slice(1).join(" "))}
              style={{
                background: "transparent", border: `1px solid ${T.border}`,
                color: T.slate, borderRadius: 999,
                padding: "7px 16px", fontSize: 13,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >{c}</motion.button>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)" }}
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${T.border}, transparent)`, margin: "0 auto" }}
        />
      </motion.div>
    </section>
  );
};

// ─── AI FLOW STRIP ────────────────────────────────────────────────────────────
const AIFlowStrip = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % FLOW_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ background: T.bgSurf, padding: "80px 24px", overflow: "hidden" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Fade>
          <p style={{
            fontFamily: "Inter, sans-serif", fontSize: 12,
            color: T.slate, textTransform: "uppercase", letterSpacing: "0.12em",
            textAlign: "center", marginBottom: 40,
          }}>How FoodLens understands you</p>
        </Fade>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          position: "relative",
        }}>
          {/* Connecting line */}
          <div style={{
            position: "absolute", top: 28, left: "12.5%", right: "12.5%", height: 1,
            background: `linear-gradient(90deg, transparent, ${T.border}, ${T.border}, transparent)`,
            zIndex: 0,
          }} />

          {FLOW_STEPS.map((s, i) => (
            <Fade key={s.label} delay={i * 0.1}>
              <div style={{ textAlign: "center", padding: "0 12px", position: "relative", zIndex: 1 }}>
                <motion.div
                  animate={{ background: step >= i ? s.color + "20" : T.bgCard, borderColor: step >= i ? s.color + "60" : T.border }}
                  transition={{ duration: 0.4 }}
                  style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: "1.5px solid",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <motion.div
                    animate={{ scale: step === i ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 10, height: 10, borderRadius: "50%", background: step >= i ? s.color : T.border }}
                  />
                </motion.div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                <motion.div
                  animate={{ opacity: step === i ? 1 : 0.35 }}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: step === i ? s.color : T.creamMid, lineHeight: 1.5 }}
                >{s.value}</motion.div>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── COMPARISON SECTION ───────────────────────────────────────────────────────
const Comparison = () => {
  const [active, setActive] = useState(0);
  const dish = DISHES[active];
  const maxPrice = Math.max(...dish.options.map(o => o.price));

  return (
    <section style={{ background: T.bg, padding: "100px 24px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Fade>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800, color: T.cream,
              letterSpacing: "-0.03em", marginBottom: 12,
            }}>Every restaurant. One view.</h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: T.slate }}>
              Pick a dish and see how FoodLens compares your options.
            </p>
          </div>
        </Fade>

        {/* Dish picker */}
        <Fade>
          <div style={{ display: "flex", gap: 10, marginBottom: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {DISHES.map((d, i) => (
              <motion.button key={d.query} type="button"
                onClick={() => setActive(i)}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: active === i ? T.brand + "20" : "transparent",
                  border: `1.5px solid ${active === i ? T.brand + "80" : T.border}`,
                  color: active === i ? T.cream : T.slate,
                  borderRadius: 12, padding: "9px 20px",
                  fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500,
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span>{d.emoji}</span>{d.query}
              </motion.button>
            ))}
          </div>
        </Fade>

        {/* Results */}
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}
          >
            {dish.options.map((opt, i) => (
              <motion.div key={opt.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: T.bgCard,
                  border: `1px solid ${i === 0 ? T.brand + "50" : T.border}`,
                  borderRadius: 16, padding: "20px 24px", marginBottom: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16, alignItems: "center",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Price bar bg */}
                <motion.div
                  initial={{ scaleX: 0 }} animate={{ scaleX: opt.price / maxPrice }}
                  transition={{ duration: 0.8, delay: i * 0.1 + 0.2, ease: "easeOut" }}
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: "100%", transformOrigin: "left",
                    background: i === 0 ? T.brand + "08" : T.amber + "05",
                    borderRadius: 16,
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: T.cream }}>{opt.name}</span>
                    <Pill color={opt.tagColor}>{opt.tag}</Pill>
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: T.slate }}>
                      ⏱ {opt.time} min
                    </span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: T.slate }}>
                      ★ {opt.rating}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right", position: "relative" }}>
                  <div style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: 26, fontWeight: 800,
                    color: i === 0 ? T.cream : T.creamMid,
                  }}>₹{opt.price}</div>
                </div>
              </motion.div>
            ))}

            <Fade delay={0.4}>
              <div style={{
                background: T.brand + "0A",
                border: `1px solid ${T.brand}25`,
                borderRadius: 12, padding: "14px 20px",
                fontFamily: "Inter, sans-serif", fontSize: 14, color: T.slate,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ color: T.brand, flexShrink: 0 }}>✦</span>
                <span>FoodLens ranked these by relevance, price, rating, and delivery time based on your query context.</span>
              </div>
            </Fade>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

// ─── DIFFERENTIATORS ──────────────────────────────────────────────────────────
const Why = () => {
  const items = [
    {
      head: "Natural language search",
      body: "Type like you'd text a friend. \"Something spicy under 300 for two\" works as well as \"biryani\".",
      mark: T.brand,
    },
    {
      head: "Relevance before ratings",
      body: "A 4.9★ pizza place won't appear at the top of your biryani search. Our AI enforces food-type relevance first.",
      mark: T.amber,
    },
    {
      head: "Real data from Zomato",
      body: "Live prices, real delivery times, active discounts — scraped fresh for every search, not cached from yesterday.",
      mark: T.success,
    },
  ];

  return (
    <section style={{ background: T.bgSurf, padding: "100px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Fade>
          <h2 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(26px, 3.5vw, 40px)",
            fontWeight: 800, color: T.cream,
            letterSpacing: "-0.03em",
            textAlign: "center", marginBottom: 56,
          }}>Why FoodLens is different</h2>
        </Fade>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 2 }}>
          {items.map((it, i) => (
            <Fade key={it.head} delay={i * 0.1}>
              <motion.div
                whileHover={{ background: T.bgCard }}
                style={{
                  padding: "36px 32px",
                  borderLeft: `2px solid ${it.mark}`,
                  background: "transparent",
                  transition: "background 0.25s",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: it.mark, marginBottom: 20 }} />
                <h3 style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 19, fontWeight: 700, color: T.cream,
                  marginBottom: 12, letterSpacing: "-0.02em",
                }}>{it.head}</h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: T.slate, lineHeight: 1.7, margin: 0 }}>{it.body}</p>
              </motion.div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── CLOSING CTA ──────────────────────────────────────────────────────────────
const ClosingCTA = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchFood(query);
      navigate("/results", { state: res });
    } catch {
      setLoading(false);
    }
  };

  return (
    <section style={{ background: T.bg, padding: "100px 24px 120px", position: "relative", overflow: "hidden" }}>
      {/* BG accent */}
      <div style={{
        position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300,
        background: `radial-gradient(ellipse, ${T.brand}0D 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        <Fade>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.slate, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 20 }}>
            Start searching
          </p>
          <h2 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 800, color: T.cream,
            letterSpacing: "-0.04em", lineHeight: 1.0, marginBottom: 40,
          }}>
            What are you<br /><span style={{ color: T.brand }}>craving?</span>
          </h2>

          <form onSubmit={handleSearch}>
            <div style={{
              background: T.bgCard,
              border: `1.5px solid ${T.border}`,
              borderRadius: 18, padding: "6px 6px 6px 22px",
              display: "flex", gap: 10, alignItems: "center",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="biryani, pizza, burgers…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: T.cream, fontSize: 16, fontFamily: "Inter, sans-serif",
                  caretColor: T.brand, minWidth: 0,
                }}
              />
              <motion.button type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.03 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                style={{
                  background: T.brand, color: T.white, border: "none",
                  borderRadius: 12, padding: "13px 26px",
                  fontSize: 15, fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  cursor: loading ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >{loading ? "…" : "Search →"}</motion.button>
            </div>
          </form>

        </Fade>
      </div>
    </section>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function FoodLensHome() {
  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", background: T.bg }}>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; }
        input::placeholder { color: ${T.slate}; opacity: 0.7; }
        @media (max-width: 640px) {
          section { padding-left: 16px !important; padding-right: 16px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <Hero />
      <AIFlowStrip />
      <Comparison />
      <Why />
      <ClosingCTA />
    </div>
  );
}