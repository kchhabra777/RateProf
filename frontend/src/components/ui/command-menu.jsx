import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, User, BookOpen, Tag, Sparkles, X, ArrowRight, CornerDownLeft, MapPin } from "lucide-react";

export function CommandMenu({
  isOpen,
  onClose,
  teachers = [],
  onSelectTeacher,
  onOpenAIInsights,
  onOpenRoadmap
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const normalizedQuery = query.toLowerCase().trim();

  // Filter teachers
  const matchedTeachers = teachers
    .filter(
      (t) =>
        t.fullName?.toLowerCase().includes(normalizedQuery) ||
        t.department?.toLowerCase().includes(normalizedQuery) ||
        (t.courses && t.courses.some((c) => c.courseCode?.toLowerCase().includes(normalizedQuery)))
    )
    .slice(0, 5)
    .map((t) => ({
      id: `teacher-${t.id || t.userId}`,
      type: "Faculty",
      title: t.fullName,
      subtitle: `${t.designation || 'Faculty'} · ${t.department}`,
      icon: User,
      badge: t.department,
      action: () => onSelectTeacher && onSelectTeacher(t)
    }));

  // Quick actions
  const defaultActions = [
    {
      id: "action-roadmap",
      type: "Navigation",
      title: "Campus Project Roadmap",
      subtitle: "View development milestones and system architecture",
      icon: MapPin,
      badge: "Docs",
      action: () => (window.location.href = "/roadmap")
    },
    {
      id: "action-marquee",
      type: "Showcase",
      title: "Community Tags Marquee",
      subtitle: "View the full-screen live tag showcase",
      icon: Tag,
      badge: "Live",
      action: () => (window.location.href = "/marquee")
    }
  ];

  const matchedActions = defaultActions.filter(
    (a) => a.title.toLowerCase().includes(normalizedQuery) || a.subtitle.toLowerCase().includes(normalizedQuery)
  );

  const allResults = [...matchedTeachers, ...matchedActions];

  // Keyboard navigation & global shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, allResults.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allResults[selectedIndex]) {
          allResults[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, allResults, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
        animation: "fadeIn 0.15s ease-out"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          backgroundColor: "#0b0f19",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          boxShadow: "0 25px 70px rgba(0,0,0,0.85), 0 0 40px rgba(168, 85, 247, 0.15)",
          overflow: "hidden",
          color: "#f8fafc"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            gap: "12px"
          }}
        >
          <Search size={18} color="#a855f7" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a professor, course (UCS503), or action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 500
            }}
          />
          <kbd
            style={{
              padding: "2px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace"
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "8px" }}>
          {allResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <p style={{ margin: 0, fontSize: "14px" }}>No matching professors or actions found.</p>
            </div>
          ) : (
            allResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    backgroundColor: isSelected ? "rgba(168, 85, 247, 0.15)" : "transparent",
                    border: isSelected ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.12s ease"
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: isSelected ? "rgba(168, 85, 247, 0.3)" : "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isSelected ? "#c084fc" : "#94a3b8"
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          color: "#cbd5e1"
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft size={13} color="#c084fc" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: "11.5px",
            color: "#64748b"
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span style={{ color: "#a855f7", fontWeight: 600 }}>Campus Spotlight</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandMenu;
