import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getThaparProfileUrl } from '../utils/teacherMedia';

export const ThaparProfileLink = ({ teacher }) => {
  const teacherEmail = teacher.user?.email || teacher.email || '';
  const teacherName = teacher.fullName || teacher.name || '';
  const isThaparEmail = teacherEmail.endsWith('@thapar.edu');
  
  if (!isThaparEmail && !teacherName) return null;

  const knownProfileUrl = getThaparProfileUrl(teacher);
  let profileUrl = knownProfileUrl;

  if (profileUrl && profileUrl.includes('google.com/url?q=')) {
    try {
      const urlObj = new URL(profileUrl.startsWith('http') ? profileUrl : `https://${profileUrl}`);
      const q = urlObj.searchParams.get('q');
      if (q) {
        profileUrl = q;
      }
    } catch (e) {
      console.error("Invalid profile URL", e);
    }
  }

  if (!profileUrl) {
    const searchQuery = teacherName
      ? `!ducky site:thapar.edu ${teacherName} faculty`
      : `!ducky site:thapar.edu ${teacherEmail.split('@')[0]} faculty`;
    profileUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
  }

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="badge badge-neutral"
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        fontSize: '11.5px',
        color: '#c2410c', // Dark orange/rust for Thapar brand
        border: '1px solid rgba(194, 65, 12, 0.2)',
        background: 'rgba(194, 65, 12, 0.05)',
      }}
    >
      <img
        src="https://www.thapar.edu/favicon.ico"
        alt="Thapar"
        style={{ width: '12px', height: '12px', borderRadius: '2px' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      {knownProfileUrl ? 'Verified Thapar Profile' : 'Thapar Profile'}
      <ExternalLink size={12} />
    </a>
  );
};
