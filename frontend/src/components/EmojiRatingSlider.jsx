import React, { useState } from 'react';
import { Star } from 'lucide-react';

const EMOJI_LEVELS = [
  {
    rating: 1,
    emoji: '😡',
    label: 'Terrible',
    description: 'Major issues / Very dissatisfied',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    glow: 'none',
  },
  {
    rating: 2,
    emoji: '🙁',
    label: 'Poor',
    description: 'Needs significant improvement',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    glow: 'none',
  },
  {
    rating: 3,
    emoji: '😐',
    label: 'Average',
    description: 'Acceptable / Standard experience',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.14)',
    border: 'rgba(234, 179, 8, 0.35)',
    glow: 'none',
  },
  {
    rating: 4,
    emoji: '🙂',
    label: 'Good',
    description: 'Engaging & very effective teaching',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    glow: 'none',
  },
  {
    rating: 5,
    emoji: '🤩',
    label: 'Outstanding',
    description: 'Inspiring, top-tier educator',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.45)',
    glow: 'none',
  },
];

export const EmojiRatingSlider = ({ rating = 5, onRatingChange }) => {
  const [hoveredRating, setHoveredRating] = useState(null);

  const activeLevel = EMOJI_LEVELS.find((l) => l.rating === (hoveredRating || rating)) || EMOJI_LEVELS[4];
  const currentRating = hoveredRating || rating;

  return (
    <div
      style={{
        background: 'var(--bg-card-subtle, rgba(248, 250, 252, 0.8))',
        border: '1px solid var(--border-light, #e2e8f0)',
        borderRadius: '16px',
        padding: '16px',
        margin: '8px 0 14px 0',
        transition: 'all 0.25s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Top Banner: Dynamic Emoji + Mood Badge + Stars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
        }}
      >
        {/* Left: Animated Emoji & Description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              fontSize: '34px',
              lineHeight: 1,
              transform: 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              userSelect: 'none',
            }}
          >
            {activeLevel.emoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentRating}.0 / 5.0
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  backgroundColor: activeLevel.bg,
                  color: activeLevel.color,
                  border: `1px solid ${activeLevel.border}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {activeLevel.label}
              </span>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
                marginTop: '2px',
              }}
            >
              {activeLevel.description}
            </div>
          </div>
        </div>

        {/* Right: Interactive Stars synced with slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((starNum) => {
            const isFilled = starNum <= currentRating;
            return (
              <button
                key={starNum}
                type="button"
                onClick={() => onRatingChange && onRatingChange(starNum)}
                onMouseEnter={() => setHoveredRating(starNum)}
                onMouseLeave={() => setHoveredRating(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  transition: 'transform 0.15s ease',
                  transform: starNum === currentRating ? 'scale(1.18)' : 'scale(1)',
                }}
                aria-label={`Rate ${starNum} stars`}
              >
                <Star
                  size={20}
                  fill={isFilled ? activeLevel.color : 'none'}
                  color={isFilled ? activeLevel.color : 'var(--star-empty, #cbd5e1)'}
                  style={{ transition: 'all 0.18s ease' }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Emoji Selector Row (1 to 5) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          marginBottom: '14px',
        }}
      >
        {EMOJI_LEVELS.map((level) => {
          const isSelected = level.rating === rating;
          const isHovered = level.rating === hoveredRating;

          return (
            <button
              key={level.rating}
              type="button"
              onClick={() => onRatingChange && onRatingChange(level.rating)}
              onMouseEnter={() => setHoveredRating(level.rating)}
              onMouseLeave={() => setHoveredRating(null)}
              style={{
                background: isSelected ? level.bg : 'transparent',
                border: isSelected ? `2px solid ${level.color}` : '1px solid transparent',
                borderRadius: '12px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isSelected || isHovered ? 'translateY(-2px) scale(1.06)' : 'scale(1)',
                boxShadow: 'none',
                opacity: isSelected ? 1 : isHovered ? 0.9 : 0.65,
              }}
            >
              <span
                style={{
                  fontSize: '26px',
                  lineHeight: 1,
                  display: 'inline-block',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                  userSelect: 'none',
                }}
              >
                {level.emoji}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? level.color : 'var(--text-secondary, #475569)',
                  whiteSpace: 'nowrap',
                }}
              >
                {level.rating} ★
              </span>
            </button>
          );
        })}
      </div>

      {/* Styled Interactive Range Slider */}
      <div style={{ position: 'relative', padding: '6px 2px' }}>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={rating}
          onChange={(e) => onRatingChange && onRatingChange(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '8px',
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer',
            background: `linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #10b981 75%, #f59e0b 100%)`,
            accentColor: activeLevel.color,
            transition: 'all 0.2s ease',
          }}
          aria-label="Rating slider"
        />

        {/* Step Tick Marks */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '6px',
            padding: '0 4px',
            userSelect: 'none',
          }}
        >
          {EMOJI_LEVELS.map((lvl) => (
            <span
              key={lvl.rating}
              onClick={() => onRatingChange && onRatingChange(lvl.rating)}
              style={{
                fontSize: '11px',
                fontWeight: lvl.rating === rating ? 700 : 500,
                color: lvl.rating === rating ? lvl.color : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
            >
              {lvl.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
