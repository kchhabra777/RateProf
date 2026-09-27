import React, { useState } from 'react';
import { 
  X, Copy, Check, Share2, ExternalLink, MessageCircle, Globe, Send, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

export const ShareProfileModal = ({ teacher, isOpen, onClose }) => {
  if (!isOpen || !teacher) return null;

  const [copied, setCopied] = useState(false);

  const teacherId = teacher.id || teacher.userId || teacher.user?.id;
  const shareUrl = `${window.location.origin}/teacher/${encodeURIComponent(teacherId)}`;
  const teacherName = teacher.fullName || 'Faculty Member';
  const teacherDept = teacher.department || 'TIET';

  const shareText = `Check out authentic student reviews and ratings for Prof. ${teacherName} (${teacherDept}) on RateProf:`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!', {
        description: 'You can now paste and share it in your batch WhatsApp group or Reddit.'
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${teacherName} - RateProf Reviews`,
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`RateProf: Student Reviews & Insights for ${teacherName} (${teacherDept})`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  const initials = teacherName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="modal-title">
                Share Professor Profile
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                Share authentic ratings & reviews with batchmates
              </span>
            </div>
          </div>
          <button className="btn btn-subtle" onClick={onClose} style={{ padding: '8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Teacher Summary Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {initials || 'TP'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {teacherName}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {teacher.designation || 'Faculty'} • {teacherDept}
              </div>
            </div>
          </div>

          {/* Copy Link Field */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
              Public Profile Link
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--bg-main)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)'
            }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-primary"
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
              >
                {copied ? (
                  <>
                    <Check size={15} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Platforms */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'block' }}>
              Quick Share Channels
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#25D366',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MessageCircle size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>WhatsApp</div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>Batch & Lab Groups</div>
                </div>
              </a>

              {/* Native Device Share */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Share2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>More Options</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>System share sheet</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-light)',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>Sharing authentic reviews helps classmates make informed elective choices and encourages faculty accountability.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ShareProfileModal;
