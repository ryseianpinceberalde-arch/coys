import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

/* ─── Reveal on scroll ─────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const Reveal = ({ children, delay = 0, from = "bottom", style = {} }) => {
  const [ref, visible] = useReveal();
  const transforms = {
    bottom: "translateY(40px)",
    left:   "translateX(-40px)",
    right:  "translateX(40px)",
    scale:  "scale(0.88)",
  };
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : transforms[from],
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
};

/* ─── Animated counter ─────────────────────────────── */
const Counter = ({ to, suffix = "", prefix = "" }) => {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [visible, to]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

/* ─── Particle canvas ──────────────────────────────── */
const Particles = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.dx; d.y += d.dy;
        if (d.x < 0 || d.x > canvas.width) d.dx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.dy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249,115,22,${d.opacity})`;
        ctx.fill();
      });
      // connect nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(249,115,22,${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
};

/* ─── Data ──────────────────────────────────────────── */
const STATS = [
  { value: 500,  suffix: "+", label: "Products Available" },
  { value: 50,   suffix: "+", label: "Happy Customers" },
  { value: 1000, suffix: "+", label: "Orders Served" },
  { value: 99,   suffix: "%", label: "Satisfaction Rate" },
];

const FEATURES = [
  { icon: "🛒", title: "Fast Checkout",      desc: "Scan or search products instantly. Complete a sale in seconds with auto-calculated totals.", color: "#f97316" },
  { icon: "📦", title: "Stock Tracking",     desc: "Always know what's in stock. Get alerts when items are running low automatically.",         color: "#3b82f6" },
  { icon: "📈", title: "Sales Reports",      desc: "Visual charts and daily summaries help you understand your best-selling products.",          color: "#22c55e" },
  { icon: "🍽️", title: "Browse Our Menu",    desc: "Customers can explore all available products with photos, prices, and categories.",         color: "#f59e0b" },
  { icon: "👥", title: "Role-Based Access",  desc: "Admin, staff, and customer accounts — each with the right tools for the right person.",     color: "#a855f7" },
  { icon: "🔒", title: "Secure System",      desc: "Encrypted passwords, token authentication, and role permissions protect your data.",         color: "#ef4444" },
];

const FOOD_ITEMS = [
  { emoji: "🥤", name: "Beverages",    price: "₱35–₱50",  tag: "Cold & Hot" },
  { emoji: "🍿", name: "Snacks",       price: "₱18–₱55",  tag: "Bestseller" },
  { emoji: "🥫", name: "Canned Goods", price: "₱35–₱75",  tag: "Pantry" },
  { emoji: "🥛", name: "Dairy",        price: "₱42–₱120", tag: "Fresh" },
  { emoji: "🧴", name: "Personal Care",price: "₱45–₱89",  tag: "Daily Use" },
  { emoji: "🍞", name: "Bakery",       price: "₱25–₱75",  tag: "Fresh Daily" },
];

const TESTIMONIALS = [
  { name: "Maria S.", role: "Regular Customer", text: "Love browsing the menu before I visit. Always know exactly what I want!", stars: 5 },
  { name: "Juan D.",  role: "Sari-sari Customer", text: "Super fast checkout, never have to wait long. Great service every time.", stars: 5 },
  { name: "Ana R.",   role: "Loyal Customer", text: "The prices are always updated and the stock is accurate. Highly recommend!", stars: 5 },
];

/* ─── Main Component ────────────────────────────────── */
const LandingPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  // Parallax scroll
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse parallax in hero
  const onMouseMove = useCallback((e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
      y: ((e.clientY - rect.top)  / rect.height - 0.5) * 12,
    });
  }, []);

  // Auto-cycle feature highlight
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const storeName = settings?.name || "Coy's Corner";
  const logoUrl   = settings?.logoUrl || "";

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", overflowX: "hidden" }}>

      {/* ─── STICKY NAV ─────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
        background: scrollY > 40 ? "rgba(6,11,24,0.95)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid var(--border)" : "1px solid transparent",
        padding: "0 clamp(1rem,4vw,2.5rem)",
        height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "background 0.4s, border-color 0.4s, backdrop-filter 0.4s",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", fontWeight: 800, fontSize: "1.15rem", flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
            background: logoUrl ? "transparent" : "linear-gradient(135deg,var(--accent),#ea580c)",
            borderRadius: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", boxShadow: "0 0 16px var(--accent-glow)",
            overflow: "hidden",
            animation: "float 3s ease-in-out infinite",
          }}>
            {logoUrl ? <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🍽️"}
          </div>
          <span style={{
            background: "linear-gradient(135deg,var(--text) 30%,var(--accent))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>{storeName}</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {["Features", "Menu", "About"].map(label => (
            <a key={label}
              href={`#${label.toLowerCase()}`}
              style={{ color: "var(--text2)", fontSize: "0.88rem", fontWeight: 500,
                padding: "0.4rem 0.8rem", borderRadius: "var(--radius-sm)",
                transition: "color 0.2s, background 0.2s", textDecoration: "none" }}
              onMouseEnter={e => { e.target.style.color = "var(--text)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.background = "transparent"; }}
            >{label}</a>
          ))}
          <Link to="/menu" className="btn primary btn-sm" style={{ textDecoration: "none", marginLeft: "0.25rem" }}>
            🍽️ View Menu
          </Link>
          {user && (
            <Link to="/" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
              Dashboard →
            </Link>
          )}
        </div>
      </nav>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={onMouseMove}
        id="about"
        style={{
          minHeight: "100vh", position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "7rem 1.5rem 5rem",
          textAlign: "center",
        }}
      >
        {/* Particle canvas */}
        <Particles />

        {/* Radial glows */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", width: "80vw", height: "80vw", maxWidth: 900,
            borderRadius: "50%", filter: "blur(130px)",
            background: "radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)",
            top: "50%", left: "50%",
            transform: `translate(calc(-50% + ${mousePos.x * 0.5}px), calc(-50% + ${mousePos.y * 0.5}px))`,
            transition: "transform 0.15s ease-out",
          }} />
          <div style={{
            position: "absolute", width: 500, height: 500,
            borderRadius: "50%", filter: "blur(100px)",
            background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
            bottom: "0%", right: "5%",
          }} />
        </div>

        {/* Floating emojis with parallax */}
        {[
          { e: "🍔", t: "12%", l: "5%",  size: "2.2rem", speed: 2.8 },
          { e: "🍕", t: "25%", l: "2%",  size: "1.8rem", speed: 3.5 },
          { e: "🌮", t: "60%", l: "4%",  size: "2rem",   speed: 2.2 },
          { e: "🍜", t: "75%", l: "8%",  size: "1.6rem", speed: 4 },
          { e: "🍣", t: "15%", r: "4%",  size: "2rem",   speed: 3.2 },
          { e: "🥗", t: "35%", r: "2%",  size: "1.8rem", speed: 2.6 },
          { e: "🍱", t: "55%", r: "5%",  size: "2.2rem", speed: 3.8 },
          { e: "☕", t: "80%", r: "7%",  size: "1.6rem", speed: 2.4 },
        ].map(({ e, t, l, r, size, speed }, i) => (
          <div key={i} style={{
            position: "absolute", fontSize: size, opacity: 0.2, userSelect: "none", pointerEvents: "none",
            top: t, left: l, right: r,
            transform: `translateY(${scrollY * 0.08 * ((i % 2 === 0 ? 1 : -1))}px)`,
            animation: `float ${speed}s ease-in-out ${i * 0.4}s infinite`,
            filter: "drop-shadow(0 0 12px rgba(249,115,22,0.4))",
          }}>{e}</div>
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.4rem 1.1rem", borderRadius: "999px",
            border: "1px solid rgba(249,115,22,0.35)",
            background: "rgba(249,115,22,0.08)",
            color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600,
            marginBottom: "2rem",
            animation: "fadeIn 0.6s 0.1s both",
            backdropFilter: "blur(8px)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--accent)",
              boxShadow: "0 0 10px var(--accent-glow)", display: "inline-block",
              animation: "pulse-ring 1.5s ease-in-out infinite",
            }} />
            Now open · Fresh products daily
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 900, lineHeight: 1.06,
            marginBottom: "1.5rem",
            animation: "fadeInUp 0.8s 0.2s both",
            letterSpacing: "-0.02em",
          }}>
            Fresh food,{" "}
            <span style={{
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              display: "inline-block",
              filter: "drop-shadow(0 0 32px rgba(249,115,22,0.5))",
            }}>every corner</span>
            <br />of your day.
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: "var(--text2)",
            maxWidth: 540, margin: "0 auto 3rem", lineHeight: 1.8,
            animation: "fadeInUp 0.8s 0.3s both",
          }}>
            {storeName} brings you quality products at great prices.
            Browse our full menu and discover what's fresh today.
          </p>

          {/* CTA */}
          <div style={{
            display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap",
            animation: "fadeInUp 0.8s 0.45s both",
          }}>
            <Link to="/menu" style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.95rem 2.5rem", borderRadius: "var(--radius)",
              background: "linear-gradient(135deg, var(--accent), #ea580c)",
              color: "#fff", fontWeight: 700, fontSize: "1rem",
              boxShadow: "0 0 32px rgba(249,115,22,0.45), 0 4px 16px rgba(0,0,0,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 0 48px rgba(249,115,22,0.6), 0 8px 24px rgba(0,0,0,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 32px rgba(249,115,22,0.45), 0 4px 16px rgba(0,0,0,0.3)"; }}
            >
              🍽️ View Our Menu
            </Link>
            <a href="#features" style={{
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.95rem 2rem", borderRadius: "var(--radius)",
              border: "1.5px solid var(--border2)", color: "var(--text2)",
              fontWeight: 600, fontSize: "1rem",
              backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.03)",
              transition: "border-color 0.2s, color 0.2s, background 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "rgba(249,115,22,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              Explore Features ↓
            </a>
          </div>

          {/* Scroll indicator */}
          <div style={{
            marginTop: "4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
            color: "var(--text3)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase",
            animation: "fadeIn 1s 1s both",
          }}>
            <div style={{
              width: 24, height: 38, border: "2px solid var(--border2)", borderRadius: "12px",
              display: "flex", justifyContent: "center", paddingTop: "6px",
            }}>
              <div style={{
                width: 4, height: 8, background: "var(--accent)", borderRadius: "2px",
                animation: "scrollDot 1.8s ease-in-out infinite",
              }} />
            </div>
            Scroll to explore
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,88,12,0.04))",
        border: "1px solid rgba(249,115,22,0.15)",
        borderLeft: "none", borderRight: "none",
        padding: "3rem clamp(1rem,4vw,3rem)",
      }}>
        <div style={{
          maxWidth: 1000, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "2rem", textAlign: "center",
        }}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div>
                <div style={{
                  fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 900, lineHeight: 1,
                  background: "linear-gradient(135deg, var(--accent), #fbbf24)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  marginBottom: "0.4rem",
                }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <div style={{ color: "var(--text2)", fontSize: "0.9rem", fontWeight: 500 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── FEATURED CATEGORIES ────────────────────────── */}
      <section id="menu" style={{ padding: "6rem clamp(1rem,4vw,3rem)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.78rem",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6rem" }}>
                What We Offer
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, marginBottom: "0.75rem" }}>
                Browse by category
              </h2>
              <p style={{ color: "var(--text2)", maxWidth: 480, margin: "0 auto" }}>
                From daily essentials to your favourite snacks — we have it all.
              </p>
            </div>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
            gap: "1rem",
          }}>
            {FOOD_ITEMS.map((item, i) => (
              <Reveal key={item.name} delay={i * 0.07} from="bottom">
                <Link to="/menu" style={{ textDecoration: "none", display: "block" }}>
                  <div style={{
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: "1.75rem 1rem",
                    textAlign: "center", cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                    position: "relative", overflow: "hidden",
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                      e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.2)";
                      e.currentTarget.style.background = "var(--surface2)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                      e.currentTarget.style.background = "var(--surface)";
                    }}
                  >
                    {/* Shine effect */}
                    <div style={{
                      position: "absolute", top: -40, left: -40, width: 80, height: 80,
                      background: "radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)",
                      borderRadius: "50%", pointerEvents: "none",
                    }} />
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem",
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>
                      {item.emoji}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.25rem" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, marginBottom: "0.5rem" }}>
                      {item.price}
                    </div>
                    <span style={{
                      display: "inline-block", fontSize: "0.68rem", fontWeight: 700,
                      padding: "0.2rem 0.65rem", borderRadius: "999px",
                      background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
                      color: "var(--accent)", letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>{item.tag}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <Link to="/menu" style={{
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 2rem", borderRadius: "var(--radius)",
                border: "1.5px solid rgba(249,115,22,0.3)", color: "var(--accent)",
                fontWeight: 600, fontSize: "0.9rem",
                background: "rgba(249,115,22,0.05)",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(249,115,22,0.12)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(249,115,22,0.05)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)"; }}
              >
                View all products →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────── */}
      <section id="features" style={{ padding: "6rem clamp(1rem,4vw,3rem)", background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.78rem",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6rem" }}>
                Platform Features
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, marginBottom: "0.75rem" }}>
                Everything in one place
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.1rem" }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div
                  onClick={() => setActiveFeature(i)}
                  style={{
                    background: activeFeature === i ? `rgba(${f.color === "#f97316" ? "249,115,22" : f.color === "#3b82f6" ? "59,130,246" : f.color === "#22c55e" ? "34,197,94" : f.color === "#f59e0b" ? "245,158,11" : f.color === "#a855f7" ? "168,85,247" : "239,68,68"},0.06)` : "var(--surface)",
                    border: activeFeature === i ? `1.5px solid ${f.color}44` : "1.5px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: "1.6rem",
                    transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", cursor: "pointer",
                    transform: activeFeature === i ? "translateY(-4px)" : "",
                    boxShadow: activeFeature === i ? `0 12px 36px rgba(0,0,0,0.4), 0 0 0 1px ${f.color}22` : "",
                  }}
                  onMouseEnter={e => { if (activeFeature !== i) { e.currentTarget.style.borderColor = f.color + "66"; e.currentTarget.style.transform = "translateY(-3px)"; } }}
                  onMouseLeave={e => { if (activeFeature !== i) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; } }}
                >
                  <div style={{
                    width: 50, height: 50, borderRadius: "var(--radius)",
                    background: `${f.color}18`, border: `1px solid ${f.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.5rem", marginBottom: "1rem",
                    boxShadow: activeFeature === i ? `0 0 20px ${f.color}30` : "",
                    transition: "box-shadow 0.3s",
                  }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem", color: activeFeature === i ? "var(--text)" : "var(--text)" }}>{f.title}</div>
                  <div style={{ color: "var(--text2)", fontSize: "0.87rem", lineHeight: 1.7 }}>{f.desc}</div>
                  {activeFeature === i && (
                    <div style={{ marginTop: "0.875rem", height: 3, borderRadius: 99,
                      background: `linear-gradient(90deg, ${f.color}, transparent)`,
                      animation: "growWidth 3s linear",
                    }} />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────── */}
      <section style={{ padding: "6rem clamp(1rem,4vw,3rem)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
              <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.78rem",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6rem" }}>
                What Customers Say
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800 }}>
                Loved by our customers
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1.25rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.12} from="bottom">
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", padding: "1.75rem",
                  transition: "border-color 0.2s, transform 0.3s",
                  position: "relative",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}
                >
                  {/* Quote mark */}
                  <div style={{
                    position: "absolute", top: "1rem", right: "1.25rem",
                    fontSize: "3.5rem", lineHeight: 1, color: "rgba(249,115,22,0.1)",
                    fontFamily: "Georgia, serif", fontWeight: 900,
                  }}>"</div>
                  {/* Stars */}
                  <div style={{ color: "#fbbf24", fontSize: "0.9rem", marginBottom: "0.75rem", letterSpacing: "0.1em" }}>
                    {"★".repeat(t.stars)}
                  </div>
                  <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.75, marginBottom: "1.25rem", fontStyle: "italic" }}>
                    "{t.text}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent), #ea580c)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "0.85rem", color: "#fff", flexShrink: 0,
                    }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.name}</div>
                      <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─────────────────────────────────── */}
      <section style={{ padding: "5rem clamp(1rem,4vw,3rem)", background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
        <Reveal from="scale">
          <div style={{
            maxWidth: 820, margin: "0 auto", textAlign: "center",
            background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,88,12,0.05))",
            border: "1px solid rgba(249,115,22,0.25)",
            borderRadius: "var(--radius-xl)", padding: "4rem 2rem",
            position: "relative", overflow: "hidden",
          }}>
            {/* Glow circles */}
            <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -80, left: -80, width: 260, height: 260, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(234,88,12,0.12), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem", animation: "float 3s ease-in-out infinite",
                filter: "drop-shadow(0 0 24px rgba(249,115,22,0.5))" }}>
                🍽️
              </div>
              <h2 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, marginBottom: "1rem" }}>
                Ready to explore?
              </h2>
              <p style={{ color: "var(--text2)", fontSize: "1.05rem", maxWidth: 440, margin: "0 auto 2.25rem", lineHeight: 1.75 }}>
                Discover fresh food, great prices, and everything {storeName} has to offer.
              </p>
              <Link to="/menu" style={{
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.6rem",
                padding: "1rem 2.75rem", borderRadius: "var(--radius)",
                background: "linear-gradient(135deg, var(--accent), #ea580c)",
                color: "#fff", fontWeight: 700, fontSize: "1.05rem",
                boxShadow: "0 0 40px rgba(249,115,22,0.4), 0 6px 20px rgba(0,0,0,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(249,115,22,0.6), 0 10px 30px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px rgba(249,115,22,0.4), 0 6px 20px rgba(0,0,0,0.3)"; }}
              >
                🍽️ View Full Menu
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "2.5rem clamp(1rem,4vw,2.5rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        background: "var(--bg)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700 }}>
          <span style={{ fontSize: "1.3rem" }}>🍽️</span>
          <span style={{ color: "var(--text2)" }}>{storeName}</span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
          {[
            { label: "View Menu", href: "/menu", type: "link" },
            { label: "Features",  href: "#features", type: "anchor" },
            { label: "About",     href: "#about",    type: "anchor" },
          ].map(item => (
            item.type === "link"
              ? <Link key={item.label} to={item.href} style={{ color: "var(--text3)", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "var(--accent)"}
                  onMouseLeave={e => e.target.style.color = "var(--text3)"}
                >{item.label}</Link>
              : <a key={item.label} href={item.href} style={{ color: "var(--text3)", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "var(--accent)"}
                  onMouseLeave={e => e.target.style.color = "var(--text3)"}
                >{item.label}</a>
          ))}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
          © {new Date().getFullYear()} {storeName} · All rights reserved
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
