const COLORS = {
  brand: "#FF5C2B",
  nightBorder: "#2A2A30",
  nightSurface: "#141417",
  slate: "#6B7280",
  white: "#FFFFFF",
};

export default function Footer() {
  return (
    <footer style={{
      background: COLORS.nightSurface,
      borderTop: `1px solid ${COLORS.nightBorder}`,
      padding: "60px 24px 40px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 40, marginBottom: 56,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 30, height: 30,
                background: COLORS.brand,
                borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>🍽️</div>
              <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 17 }}>
                FoodLens<span style={{ color: COLORS.brand }}>AI</span>
              </span>
            </div>
            <p style={{ color: COLORS.slate, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              AI-powered food discovery across every delivery platform.
            </p>
          </div>

          {[
            {
              title: "Product", links: ["Features", "Pricing", "API Access", "Chrome Extension"],
            },
            {
              title: "Company", links: ["About", "Blog", "Careers", "Press Kit"],
            },
            {
              title: "Support", links: ["Help Center", "Contact", "Privacy Policy", "Terms of Service"],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <div style={{ color: COLORS.white, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{title}</div>
              {links.map(l => (
                <a key={l} href="#" style={{
                  display: "block", color: COLORS.slate,
                  fontSize: 14, marginBottom: 10,
                  textDecoration: "none", transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.target.style.color = COLORS.white}
                  onMouseLeave={e => e.target.style.color = COLORS.slate}
                >{l}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop: `1px solid ${COLORS.nightBorder}`,
          paddingTop: 24,
          display: "flex", flexWrap: "wrap", gap: 16,
          alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ color: COLORS.slate, fontSize: 13, margin: 0 }}>
            © 2025 FoodLens AI. Built with ❤️ in India.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Twitter / X", "LinkedIn", "Instagram"].map(s => (
              <a key={s} href="#" style={{
                color: COLORS.slate, fontSize: 13, textDecoration: "none",
                transition: "color 0.2s",
              }}
                onMouseEnter={e => e.target.style.color = COLORS.white}
                onMouseLeave={e => e.target.style.color = COLORS.slate}
              >{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
