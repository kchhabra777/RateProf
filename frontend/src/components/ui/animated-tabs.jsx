import React from "react";
import { motion } from "framer-motion";

export function AnimatedTabs({
  tabs = [],
  activeTab,
  onChange,
  className = "",
  style = {}
}) {
  return (
    <div 
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px",
        borderRadius: "12px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        position: "relative",
        gap: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        ...style
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              fontSize: "13.5px",
              fontWeight: 600,
              color: isActive ? "#ffffff" : "var(--text-secondary)",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              zIndex: 1,
              transition: "color 0.2s ease"
            }}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "8px",
                  background: "var(--primary)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                  zIndex: -1
                }}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            {Icon && <Icon size={15} style={{ opacity: isActive ? 1 : 0.8 }} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AnimatedTabs;
