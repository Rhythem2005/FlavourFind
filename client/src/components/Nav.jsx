import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const COLORS = {
  brand: "#FF5C2B",
  nightBorder: "#2A2A30",
  slateLight: "#9CA3AF",
  white: "#FFFFFF",
};

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(13,13,15,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${COLORS.nightBorder}` : "none",
        transition: "all 0.3s ease",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          background: COLORS.brand,
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>🍽️</div>
        <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
          FoodLens<span style={{ color: COLORS.brand }}>AI</span>
        </span>
      </div>

      {/* Desktop Links */}
      <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "How It Works", "Pricing", "Blog"].map(link => (
          <a key={link} href="#" style={{
            color: COLORS.slateLight, fontSize: 14, fontWeight: 500,
            textDecoration: "none", transition: "color 0.2s",
          }}
            onMouseEnter={e => e.target.style.color = COLORS.white}
            onMouseLeave={e => e.target.style.color = COLORS.slateLight}
          >{link}</a>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a href="#" style={{
          color: COLORS.slateLight, fontSize: 14, fontWeight: 500,
          textDecoration: "none", padding: "8px 16px",
        }}>Sign in</a>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: COLORS.brand, color: "#fff",
            border: "none", borderRadius: 10,
            padding: "9px 20px", fontSize: 14, fontWeight: 700,
            cursor: "pointer",
          }}
        >Get Started Free</motion.button>
      </div>
    </motion.nav>
  );
}
