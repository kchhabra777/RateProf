import React, { useState, useEffect } from 'react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { ArrowLeft, BookOpen, ExternalLink, Award, Sparkles, LogIn, Share2 } from 'lucide-react';
import { updatePageSEO, buildTeacherSchema } from '../utils/seo';
import CloudLoader from '../components/ui/quantum-cloud-loader';
import { ThaparProfileLink } from '../components/ThaparProfileLink';
import { ShareProfileModal } from '../components/ShareProfileModal';

export function PublicTeacherProfile({ teacherId, onBack, onLoginClick }) {
  const [teacher, setTeacher] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setReviewsPage(1);
      try {
        // Fetch teacher details
        const teacherRes = await fetch(`/api/profile/teachers/${encodeURIComponent(teacherId)}`);
        const teacherData = await teacherRes.json();
        
        if (!teacherRes.ok || !teacherData.teacher) {
          throw new Error(teacherData.error || 'Faculty member not found');
        }

        const t = teacherData.teacher;
        setTeacher(t);

        // Fetch ratings and reviews
        const [reviewsRes, ratingsRes] = await Promise.all([
          fetch(`/api/feedback/reviews/${encodeURIComponent(t.userId || t.id)}?page=1`).then(r => r.json()).catch(() => ({ reviews: [], totalReviews: 0 })),
          fetch(`/api/feedback/ratings/${encodeURIComponent(t.userId || t.id)}`).then(r => r.json()).catch(() => null)
        ]);

        const rList = reviewsRes.reviews || [];
        setReviews(rList);
        setHasMoreReviews(rList.length < (reviewsRes.totalReviews || 0));
        setRatings(ratingsRes);

        // Update SEO Metadata dynamically
        const pageTitle = `${t.fullName} Reviews, Ratings & Courses | RateProf`;
        const pageDesc = `Read authentic student reviews, ratings, and course allocations for ${t.fullName} (${t.department}) at Thapar Institute.`;
        const schema = buildTeacherSchema(t, ratingsRes);

        updatePageSEO({
          title: pageTitle,
          description: pageDesc,
          url: `https://www.rateprof.tech/teacher/${encodeURIComponent(t.id || t.userId)}`,
          schema
        });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (teacherId) {
      loadData();
    }
  }, [teacherId]);

  const loadMoreReviews = async () => {
    if (loadingMore || !hasMoreReviews || !teacher) return;
    setLoadingMore(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await fetch(`/api/feedback/reviews/${encodeURIComponent(teacher.userId || teacher.id)}?page=${nextPage}`).then(r => r.json());
      const newReviews = res.reviews || [];
      setReviews(prev => [...prev, ...newReviews]);
      setReviewsPage(nextPage);
      setHasMoreReviews(reviews.length + newReviews.length < (res.totalReviews || 0));
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setLoadingMore(false);
    }
  };


  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-default)', color: 'var(--text-primary)' }}>
        <CloudLoader />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading faculty profile & verified reviews…</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '30px', textAlign: 'center' }}>
        <h2>Faculty Profile Not Found</h2>
        <p style={{ color: 'var(--text-muted)', margin: '16px 0 24px' }}>
          {error || "The faculty member you are looking for does not exist or hasn't been indexed yet."}
        </p>
        <button onClick={onBack} className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Home
        </button>
      </div>
    );
  }

  const avatar = teacher.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName)}&background=2563eb&color=fff&bold=true`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }} className="fade-in">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Directory
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsShareOpen(true)} 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Share professor profile"
          >
            <Share2 size={14} /> Share Profile
          </button>
          <button onClick={onLoginClick} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={14} /> Log In to Rate This Professor
          </button>
        </div>
      </div>

      {/* Professor Overview Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            padding: '4px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            boxShadow: '0 16px 40px rgba(139, 92, 246, 0.4)',
            flexShrink: 0
          }}>
            <img
              src={avatar}
              alt={teacher.fullName}
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '4px solid var(--bg-card)'
              }}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName)}&background=2563eb&color=fff&bold=true`;
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px' }}>{teacher.fullName}</h1>
            <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
              {teacher.designation} • {teacher.department}
            </div>
            {teacher.roomNumber && (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span style={{ fontWeight: 600 }}>Room:</span> {teacher.roomNumber}
              </div>
            )}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Thapar Institute of Engineering and Technology (TIET)
            </div>

            {/* Course tags — deduped, no raw batch string */}
            {teacher.offerings && teacher.offerings.length > 0 && (() => {
              const seen = new Set();
              const ltpLabel = { L: 'Lecture', T: 'Tutorial', P: 'Lab' };
              return (
                <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {teacher.offerings.filter(off => {
                    const key = `${off.courseCode}-${off.ltp || 'L'}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  }).map((off, idx) => (
                    <span key={idx} className="badge badge-neutral" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      <BookOpen size={12} style={{ marginRight: '4px' }} />
                      {off.courseCode}{off.courseName ? ` - ${off.courseName}` : ''} · {ltpLabel[off.ltp] || off.ltp || 'Lecture'}
                    </span>
                  ))}
                </div>
              );
            })()}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <ThaparProfileLink teacher={teacher} />
              {teacher.linkedIn && (
                <a
                  href={teacher.linkedIn.startsWith('http') ? teacher.linkedIn : `https://${teacher.linkedIn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge badge-neutral"
                  style={{
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  LinkedIn Profile
                </a>
              )}
            </div>
          </div>

          {/* Overall Rating Box */}
          <div style={{ textAlign: 'center', minWidth: '130px', padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Overall Score
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', margin: '4px 0' }}>
              {ratings?.overallRating ? ratings.overallRating.toFixed(1) : '5.0'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              <StarRating rating={Math.round(ratings?.overallRating || 5)} readOnly size={16} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Based on {ratings?.totalReviews || reviews.length} student reviews
            </div>
          </div>
        </div>
      </div>

      {/* Login Callout Banner */}
      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Studied under {teacher.fullName}?</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Log in with your official university email to leave an authentic review and help juniors make informed course choices.
          </div>
        </div>
        <button onClick={onLoginClick} className="btn btn-primary btn-sm">
          Rate {teacher.fullName.split(' ')[0]}
        </button>
      </div>

      {/* Reviews Section */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
          Student Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No reviews yet for this faculty member. Be the first to leave feedback!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(rev => (
              <ReviewCard key={rev.reviewId} review={rev} readOnly={true} />
            ))}
            {hasMoreReviews && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={loadMoreReviews}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More Reviews'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Faculty Profile Modal */}
      {isShareOpen && teacher && (
        <ShareProfileModal
          teacher={teacher}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
}
