import React from "react";

const ICONS = ["💰", "🧾", "⚠️", "📦", "👥", "📈"];
const COLORS = ["card-accent", "card-green", "card-red", "card-blue", "card-green", "card-accent"];

const DashboardCards = ({ cards }) => {
  return (
    <div className="card-grid stagger">
      {cards.map((card, i) => (
        <div key={card.label} className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            {card.icon ?? ICONS[i % ICONS.length]}
          </div>
          <div className="card-label">{card.label}</div>
          <div className={`card-value ${card.color ?? COLORS[i % COLORS.length]}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
