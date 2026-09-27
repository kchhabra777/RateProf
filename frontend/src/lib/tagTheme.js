export const TAG_THEMES = {
  'Approachable': {
    name: 'Approachable',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.4)',
    borderSubtle: 'rgba(16, 185, 129, 0.2)',
    bg: 'rgba(16, 185, 129, 0.05)',
    activeBg: 'rgba(16, 185, 129, 0.15)',
    glow: '0 0 12px rgba(16, 185, 129, 0.35)',
  },
  'Clear Explanations': {
    name: 'Clear Explanations',
    color: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.4)',
    borderSubtle: 'rgba(59, 130, 246, 0.2)',
    bg: 'rgba(59, 130, 246, 0.05)',
    activeBg: 'rgba(59, 130, 246, 0.15)',
    glow: '0 0 12px rgba(59, 130, 246, 0.35)',
  },
  'Engaging Lectures': {
    name: 'Engaging Lectures',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.4)',
    borderSubtle: 'rgba(168, 85, 247, 0.2)',
    bg: 'rgba(168, 85, 247, 0.05)',
    activeBg: 'rgba(168, 85, 247, 0.15)',
    glow: '0 0 12px rgba(168, 85, 247, 0.35)',
  },
  'Heavy Workload': {
    name: 'Heavy Workload',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.4)',
    borderSubtle: 'rgba(245, 158, 11, 0.2)',
    bg: 'rgba(245, 158, 11, 0.05)',
    activeBg: 'rgba(245, 158, 11, 0.15)',
    glow: '0 0 12px rgba(245, 158, 11, 0.35)',
  },
  'Tough Grader': {
    name: 'Tough Grader',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.4)',
    borderSubtle: 'rgba(239, 68, 68, 0.2)',
    bg: 'rgba(239, 68, 68, 0.05)',
    activeBg: 'rgba(239, 68, 68, 0.15)',
    glow: '0 0 12px rgba(239, 68, 68, 0.35)',
  }
};

export const DEFAULT_TAG_THEME = {
  color: '#94a3b8',
  border: 'rgba(148, 163, 184, 0.4)',
  borderSubtle: 'rgba(148, 163, 184, 0.2)',
  bg: 'rgba(148, 163, 184, 0.05)',
  activeBg: 'rgba(148, 163, 184, 0.15)',
  glow: '0 0 12px rgba(148, 163, 184, 0.25)',
};

export function getTagTheme(tagName) {
  return TAG_THEMES[tagName] || DEFAULT_TAG_THEME;
}
