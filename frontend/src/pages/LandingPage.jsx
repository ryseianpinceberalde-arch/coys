import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import api from "../utils/api";

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
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "159,183,255";
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
        ctx.fillStyle = `rgba(${accentRgb},${d.opacity})`;
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
            ctx.strokeStyle = `rgba(${accentRgb},${0.08 * (1 - dist / 110)})`;
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

/* ─── Category emoji helper ─────────────────────────── */
const CAT_EMOJIS = ["🍔", "🍕", "🍜", "🍣", "🌮", "🥗", "🍱", "🥩", "🍗", "🥘", "🍛", "🥪", "🥤", "🍿", "🥫", "🥛", "🧴", "🍞"];
function catEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("burger") || n.includes("beef")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("noodle") || n.includes("pasta") || n.includes("ramen")) return "🍜";
  if (n.includes("sushi") || n.includes("fish") || n.includes("seafood")) return "🍣";
  if (n.includes("taco") || n.includes("wrap")) return "🌮";
  if (n.includes("salad") || n.includes("veg")) return "🥗";
  if (n.includes("chicken") || n.includes("poultry")) return "🍗";
  if (n.includes("rice") || n.includes("fried")) return "🍱";
  if (n.includes("soup") || n.includes("stew")) return "🥘";
  if (n.includes("curry") || n.includes("indian")) return "🍛";
  if (n.includes("sandwich") || n.includes("sub")) return "🥪";
  if (n.includes("drink") || n.includes("bev") || n.includes("juice")) return "🥤";
  if (n.includes("snack") || n.includes("chip")) return "🍿";
  if (n.includes("can") || n.includes("canned") || n.includes("tin")) return "🥫";
  if (n.includes("dairy") || n.includes("milk") || n.includes("cheese")) return "🥛";
  if (n.includes("care") || n.includes("hygiene") || n.includes("personal")) return "🧴";
  if (n.includes("bread") || n.includes("bak")) return "🍞";
  if (n.includes("meat") || n.includes("pork") || n.includes("steak")) return "🥩";
  if (!name) return CAT_EMOJIS[0];
  const i = name.charCodeAt(0) % CAT_EMOJIS.length;
  return CAT_EMOJIS[i];
}

/* ─── Data ──────────────────────────────────────────── */
const STATS = [
  { value: 500,  suffix: "+", label: "Products Available" },
  { value: 50,   suffix: "+", label: "Happy Customers" },
  { value: 1000, suffix: "+", label: "Orders Served" },
  { value: 99,   suffix: "%", label: "Satisfaction Rate" },
];

const FEATURES = [
  { icon: "🛒", title: "Fast Checkout",      desc: "Scan or search products instantly. Complete a sale in seconds with auto-calculated totals.", color: "#9fb7ff" },
  { icon: "📦", title: "Stock Tracking",     desc: "Always know what's in stock. Get alerts when items are running low automatically.",         color: "#3b82f6" },
  { icon: "📈", title: "Sales Reports",      desc: "Visual charts and daily summaries help you understand your best-selling products.",          color: "#22c55e" },
  { icon: "🏪", title: "Walk-in Store Only",  desc: "We are an in-store experience — no delivery. Visit us and pick up your orders in person.", color: "#f59e0b" },
  { icon: "👥", title: "Role-Based Access",  desc: "Admin, staff, and customer accounts — each with the right tools for the right person.",     color: "#a855f7" },
  { icon: "🔒", title: "Secure System",      desc: "Encrypted passwords, token authentication, and role permissions protect your data.",         color: "#ef4444" },
];


const FALLBACK_CATEGORIES = [
  { name: "Beverages" },
  { name: "Snacks" },
  { name: "Canned Goods" },
  { name: "Dairy" },
  { name: "Personal Care" },
  { name: "Bakery" },
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

  const [selectedItem, setSelectedItem] = useState(null);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    api.get("/categories")
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);
  const showcaseCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
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
            background: logoUrl ? "transparent" : "linear-gradient(135deg,var(--accent),var(--accent2))",
            borderRadius: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", boxShadow: logoUrl ? "none" : "0 0 16px var(--accent-glow)",
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
            background: "radial-gradient(circle, var(--accent-soft-5) 0%, transparent 70%)",
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
            filter: "drop-shadow(0 0 12px var(--accent-glow))",
          }}>{e}</div>
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.4rem 1.1rem", borderRadius: "999px",
            border: "1px solid var(--accent-border-strong)",
            background: "var(--accent-soft-2)",
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
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent2) 55%, var(--text) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              display: "inline-block",
              filter: "drop-shadow(0 0 32px var(--accent-glow-strong))",
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
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              color: "var(--accent-ink)", fontWeight: 700, fontSize: "1rem",
              boxShadow: "0 0 32px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 0 48px var(--accent-glow-intense), 0 8px 24px rgba(0,0,0,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 32px var(--accent-glow), 0 4px 16px rgba(0,0,0,0.3)"; }}
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
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border-strong)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--accent-soft-1)"; }}
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
        background: "linear-gradient(135deg, var(--accent-soft-2), rgba(207,219,255,0.04))",
        border: "1px solid var(--accent-soft-5)",
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
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
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
            {showcaseCategories.map((cat, i) => (
              <Reveal key={cat._id || cat.name} delay={i * 0.07} from="bottom">
                <div onClick={() => setSelectedItem({ ...cat, emoji: catEmoji(cat.name) })} style={{ display: "block" }}>
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
                      e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--accent-soft-5)";
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
                      background: "radial-gradient(circle, var(--accent-soft-4), transparent 70%)",
                      borderRadius: "50%", pointerEvents: "none",
                    }} />
                    <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem",
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>
                      {catEmoji(cat.name)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                      {cat.name}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <Link to="/menu" style={{
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 2rem", borderRadius: "var(--radius)",
                border: "1.5px solid var(--accent-border-strong)", color: "var(--accent)",
                fontWeight: 600, fontSize: "0.9rem",
                background: "var(--accent-soft-1)",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-soft-4)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-soft-1)"; e.currentTarget.style.borderColor = "var(--accent-border-strong)"; }}
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
                    background: activeFeature === i ? `rgba(${f.color === "#9fb7ff" ? "159,183,255" : f.color === "#3b82f6" ? "59,130,246" : f.color === "#22c55e" ? "34,197,94" : f.color === "#f59e0b" ? "245,158,11" : f.color === "#a855f7" ? "168,85,247" : "239,68,68"},0.06)` : "var(--surface)",
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
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border-strong)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}
                >
                  {/* Quote mark */}
                  <div style={{
                    position: "absolute", top: "1rem", right: "1.25rem",
                    fontSize: "3.5rem", lineHeight: 1, color: "var(--accent-soft-3)",
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
                      background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-ink)", flexShrink: 0,
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
            background: "linear-gradient(135deg, var(--accent-soft-3), rgba(207,219,255,0.05))",
            border: "1px solid var(--accent-border)",
            borderRadius: "var(--radius-xl)", padding: "4rem 2rem",
            position: "relative", overflow: "hidden",
          }}>
            {/* Glow circles */}
            <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%",
              background: "radial-gradient(circle, var(--accent-soft-6), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -80, left: -80, width: 260, height: 260, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(207,219,255,0.12), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem", animation: "float 3s ease-in-out infinite",
                filter: "drop-shadow(0 0 24px var(--accent-glow-strong))" }}>
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
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: "var(--accent-ink)", fontWeight: 700, fontSize: "1.05rem",
                boxShadow: "0 0 40px var(--accent-glow), 0 6px 20px rgba(0,0,0,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px var(--accent-glow-intense), 0 10px 30px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px var(--accent-glow), 0 6px 20px rgba(0,0,0,0.3)"; }}
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

      {/* ─── FOOD ITEM MODAL ─────────────────────────────── */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1.5px solid var(--accent-border-strong)",
              borderRadius: "var(--radius-xl)",
              padding: "2.5rem 2rem",
              maxWidth: 360,
              width: "100%",
              textAlign: "center",
              position: "relative",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--accent-rgb), 0.1)",
              animation: "fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                color: "var(--text2)", fontSize: "0.9rem",
                cursor: "pointer", width: 30, height: 30,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s, color 0.2s",
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-soft-5)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text2)"; }}
            >✕</button>

            {/* Emoji image */}
            <div style={{
              width: 110, height: 110, borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, var(--accent-soft-4), rgba(207,219,255,0.06))",
              border: "1.5px solid var(--accent-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "4rem", margin: "0 auto 1.25rem",
              boxShadow: "0 8px 32px var(--accent-soft-5)",
              animation: "float 3s ease-in-out infinite",
            }}>
              {selectedItem.emoji}
            </div>

            {/* Name */}
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--text)" }}>
              {selectedItem.name}
            </h3>

            {/* Action */}
            <Link
              to={selectedItem._id ? `/menu?category=${selectedItem._id}` : "/menu"}
              onClick={() => setSelectedItem(null)}
              style={{
                textDecoration: "none", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "0.5rem",
                padding: "0.85rem 1.5rem", borderRadius: "var(--radius)",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                color: "var(--accent-ink)", fontWeight: 700, fontSize: "0.95rem",
                boxShadow: "0 0 28px var(--accent-glow)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 44px var(--accent-glow-intense)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 28px var(--accent-glow)"; }}
            >
              🍽️ Browse {selectedItem.name}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
