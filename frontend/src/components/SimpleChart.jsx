import React, { useEffect, useRef } from "react";

const SimpleChart = ({ data }) => {
  const barsRef = useRef([]);

  useEffect(() => {
    // Animate bars in on mount
    barsRef.current.forEach((el, i) => {
      if (!el) return;
      const targetH = el.dataset.target;
      el.style.height = "0%";
      setTimeout(() => {
        el.style.height = targetH;
      }, 80 + i * 40);
    });
  }, [data]);

  if (!data || !data.length) {
    return (
      <div
        className="chart"
        style={{ alignItems: "center", justifyContent: "center", color: "var(--text3)" }}
      >
        No data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="chart" style={{ alignItems: "flex-end" }}>
      {data.map((d, i) => {
        const pct = `${((d.value / max) * 100) || 0}%`;
        return (
          <div key={d.label} className="chart-bar" title={`$${d.value?.toFixed?.(2) ?? d.value}`}>
            <div
              ref={(el) => (barsRef.current[i] = el)}
              className="chart-bar-inner"
              data-target={pct}
              style={{
                height: pct,
                transition: "height 0.6s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
            <span className="chart-bar-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleChart;
