import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { getSavedRestaurants } from "../utils/storage";

const COLORS = {
  brand: "#FF5C2B",
  nightBorder: "#2A2A30",
  slateLight: "#9CA3AF",
  white: "#FFFFFF",
};

export default function Nav() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    
    // Bookmark count listener
    const updateCount = () => {
      setSavedCount(getSavedRestaurants().length);
    };
    updateCount();
    window.addEventListener("foodlens_saved_changed", updateCount);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("foodlens_saved_changed", updateCount);
    };
  }, []);

  const links = [
    { label: "Search", path: "/" },
    { label: "Saved", path: "/saved", count: savedCount },
    { label: "History", path: "/history" },
    { label: "Insights", path: "/insights" },
  ];

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
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
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
      </Link>

      {/* Navigation Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {links.map(link => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.label}
              to={link.path}
              style={{
                color: isActive ? COLORS.white : COLORS.slateLight,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
                transition: "color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {link.label}
              {link.count !== undefined && link.count > 0 && (
                <span style={{
                  background: COLORS.brand,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 99,
                }}>
                  {link.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

