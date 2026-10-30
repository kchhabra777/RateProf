import React from 'react';
import { StarRating } from './StarRating';
import { Award, BookOpen, Clock, TrendingUp, ChevronRight, Edit3, Crown, HelpCircle } from 'lucide-react';
import { TiltCard } from './ui/tilt-card';

export const TeacherCard = ({ teacher, ratings, onViewReviews, onWriteReview, onSuggestName, canReview = false, isCR = false }) => {
  const rObj = ratings?.rating || ratings || {};
  const overallRating = Number(rObj.overallRating) || 0;
  const recentRating = Number(rObj.recentRating) || 0;
  const totalReviews = Number(rObj.totalReviews) || 0;

  const isCodeName = Boolean(
    teacher.fullName?.startsWith("Teacher (") ||
    teacher.code === teacher.fullName ||
    /^[A-Z0-9]{2,5}$/.test(teacher.fullName?.trim() || '')
  );

  return (
    <TiltCard 
      className="card" 
      tiltLimit={7} 
      scale={1.025} 
      spotlight={true} 
      onClick={() => onViewReviews && onViewReviews(teacher)}
      role="button"
      tabIndex={0}
      aria-label={`View reviews for ${teacher.fullName || 'teacher'}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onViewReviews && onViewReviews(teacher);
        }
      }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        position: 'relative',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          padding: '3px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
          flexShrink: 0
        }}>
          <img
            src={
              teacher.photoUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName || teacher.code || 'Faculty')}&background=2563eb&color=fff&bold=true`
            }
            alt={teacher.fullName}
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '3px solid var(--bg-card)'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName || teacher.code || 'Faculty')}&background=2563eb&color=fff&bold=true`;
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{teacher.fullName}</span>
            {teacher.code && !teacher.fullName.includes(teacher.code) && (
              <span className="badge badge-neutral" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                {teacher.code}
              </span>
            )}
          </h3>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Award size={13} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {teacher.designation || 'Faculty'} · {teacher.department}
            </span>
          </div>
          {teacher.roomNumber && (
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
               <span style={{ fontWeight: 600 }}>Room:</span> {teacher.roomNumber}
            </div>
          )}

          {onSuggestName && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSuggestName(teacher);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '6px',
                padding: '3px 8px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '6px',
                background: isCR ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37, 99, 235, 0.08)',
                color: isCR ? '#b45309' : '#2563eb',
                border: isCR ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(37, 99, 235, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isCodeName ? "Suggest this faculty member's full name" : "Add missing courses or info to this verified faculty member"}
            >
              {isCR ? <Crown size={12} /> : (isCodeName ? <HelpCircle size={12} /> : <Edit3 size={12} />)}
              <span>
                {isCodeName 
                  ? (isCR ? "CR: Identify Faculty" : "Know this prof? Suggest name")
                  : "Add Info / Course"
                }
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Two-Tier Ratings Badge Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0', padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            <span>Overall (Time-Decay)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: overallRating > 0 ? 'var(--star-gold)' : 'var(--text-muted)' }}>
              {overallRating > 0 ? overallRating.toFixed(1) : 'N/A'}
            </span>
            {overallRating > 0 && <StarRating rating={overallRating} size={14} />}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={11} />
            <span>Current Rating</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: recentRating > 0 ? '#2563eb' : 'var(--text-muted)' }}>
              {recentRating > 0 ? recentRating.toFixed(1) : 'N/A'}
            </span>
            {recentRating > 0 && <StarRating rating={recentRating} size={14} />}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Based on {totalReviews} {totalReviews === 1 ? 'student review' : 'student reviews'}
      </div>

      {/* Courses Taught — grouped by course code and LTP, showing batches */}
      <div style={{ flex: 1, marginBottom: '16px', minHeight: '52px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <BookOpen size={12} />
          <span>Courses Taught:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {(() => {
            const raw = (teacher.courses?.length > 0 ? teacher.courses : teacher.offerings) || [];
            if (raw.length === 0) {
              return (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 0' }}>
                  No courses registered yet
                </span>
              );
            }
            
            // Group by unique courseCode and aggregate LTPs & batches
            const courseMap = {};
            raw.forEach(c => {
              const code = (c.courseCode || '').trim().toUpperCase();
              if (!code) return;
              if (!courseMap[code]) {
                courseMap[code] = { courseCode: code, courseName: (c.courseName || '').trim(), ltpSet: new Set(), batches: new Set() };
              }
              if (c.courseName && (!courseMap[code].courseName || courseMap[code].courseName.length < c.courseName.trim().length)) {
                courseMap[code].courseName = c.courseName.trim();
              }
              if (c.ltp) {
                const l = c.ltp.trim().toUpperCase();
                if (l === 'L') courseMap[code].ltpSet.add('Lecture');
                else if (l === 'T') courseMap[code].ltpSet.add('Tutorial');
                else if (l === 'P') courseMap[code].ltpSet.add('Lab');
                else courseMap[code].ltpSet.add(c.ltp);
              }
              if (c.batchTaught && c.batchTaught.toUpperCase() !== 'ALL') {
                c.batchTaught.split(',').forEach(b => {
                  const tb = b.trim().toUpperCase();
                  if (tb && tb !== 'ALL' && tb !== 'ELECTIVE' && !tb.includes('ELECTIVE')) {
                    courseMap[code].batches.add(tb);
                  }
                });
              }
            });

            const formatLtps = (ltpSet) => {
              const order = ['Lecture', 'Tutorial', 'Lab'];
              const list = order.filter(x => ltpSet.has(x));
              ltpSet.forEach(x => { if (!order.includes(x)) list.push(x); });
              if (list.length === 0) return 'Lecture';
              if (list.length === 1) return list[0];
              if (list.length === 2) return `${list[0]} & ${list[1]}`;
              return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
            };

            const formatBatches = (batches) => {
              const arr = Array.from(batches);
              if (arr.length === 0) return '';
              if (arr.length <= 3) return arr.join(', ');
              return `${arr.slice(0, 3).join(', ')} +${arr.length - 3}`;
            };
            
            const grouped = Object.values(courseMap);
            const MAX_VISIBLE = 3;
            const visibleCourses = grouped.slice(0, MAX_VISIBLE);
            const remainingCount = grouped.length - MAX_VISIBLE;
            const remainingCoursesTooltip = remainingCount > 0 
              ? grouped.slice(MAX_VISIBLE).map(c => c.courseName ? `${c.courseCode}: ${c.courseName}` : c.courseCode).join('\n')
              : '';

            return (
              <>
                {visibleCourses.map((c, i) => {
                  const ltpStr = formatLtps(c.ltpSet);
                  const batchStr = formatBatches(c.batches);
                  return (
                    <span 
                      key={i} 
                      className="badge badge-neutral" 
                      style={{ 
                        display: 'inline-block',
                        fontSize: '11.5px', 
                        lineHeight: '1.4',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} 
                      title={c.courseName ? `${c.courseCode}: ${c.courseName}` : c.courseCode}
                    >
                      <span style={{ fontWeight: 600 }}>{c.courseCode}</span>
                      {c.courseName && c.courseName.toUpperCase() !== c.courseCode ? ` - ${c.courseName}` : ''} · {ltpStr}
                      {batchStr && (
                        <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                          ({batchStr})
                        </span>
                      )}
                    </span>
                  );
                })}
                {remainingCount > 0 && (
                  <span 
                    className="badge badge-neutral" 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      lineHeight: '1.4', 
                      cursor: 'pointer',
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.25)' 
                    }} 
                    title={`Additional courses:\n${remainingCoursesTooltip}`}
                  >
                    +{remainingCount} more
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', position: 'relative', zIndex: 20 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewReviews && onViewReviews(teacher);
          }}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
        >
          <span>View Reviews</span>
          <ChevronRight size={14} />
        </button>

        {canReview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWriteReview && onWriteReview(teacher);
            }}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
          >
            <Edit3 size={14} />
            <span>Write Review</span>
          </button>
        )}
      </div>
    </TiltCard>
  );
};
