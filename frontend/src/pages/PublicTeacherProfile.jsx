import React, { useState, useEffect } from 'react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { ArrowLeft, BookOpen, ExternalLink, Award, Sparkles, LogIn, Share2 } from 'lucide-react';
import { updatePageSEO, buildTeacherSchema } from '../utils/seo';
import CloudLoader from '../components/ui/quantum-cloud-loader';
import { ThaparProfileLink } from '../components/ThaparProfileLink';
import { ShareProfileModal } from '../components/ShareProfileModal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TeacherAvatar } from '../components/TeacherAvatar';

export function PublicTeacherProfile({ teacherId, onBack, onLoginClick }) {
  const { user } = useAuth();
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
        // Teacher details; the identifier may be a profile id, a user id or a name slug
        // such as "dr-anjula-mehto", which the profiles service resolves
        const teacherData = await api.getTeacherProfile(encodeURIComponent(teacherId));
        if (!teacherData?.teacher) {
          throw new Error('Faculty member not found');
        }

        const t = teacherData.teacher;
        setTeacher(t);

        // Reviews and ratings are keyed by the teacher's user id
        const revieweeId = encodeURIComponent(t.userId);
        const [reviewsRes, ratingsRes] = await Promise.all([
          api.getTeacherReviews(revieweeId, 1).catch(() => ({ reviews: [], totalReviews: 0 })),
          api.getTeacherRatings(revieweeId).catch(() => null)
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
      const res = await api.getTeacherReviews(encodeURIComponent(teacher.userId), nextPage);
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

  // "Dr. Anjula Mehto" -> "Anjula" for the call-to-action button
  const firstName = teacher.fullName.split(/\s+/).find(w => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(w)) || teacher.fullName;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }} className="fade-in">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Directory
        </button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setIsShareOpen(true)} 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Share professor profile"
          >
            <Share2 size={14} /> Share Profile
          </button>
          <button onClick={onLoginClick} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={14} /> {user ? 'Rate This Professor' : 'Log In to Rate This Professor'}
          </button>
        </div>
      </div>

      {/* Professor Overview Card */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TeacherAvatar
            teacher={teacher}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              padding: '4px',
              background: 'linear-gradient(135deg, #9f1515 0%, #d32f2f 50%, #fbd5d5 100%)',
              boxShadow: '0 16px 36px rgba(183, 28, 28, 0.25)',
              flexShrink: 0
            }}
            imgStyle={{ border: '4px solid var(--bg-card)' }}
          />
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

            {/* Course tags — unique courses taught by teacher */}
            {teacher.offerings && teacher.offerings.length > 0 && (() => {
              const courseMap = {};
              teacher.offerings.forEach(off => {
                const code = (off.courseCode || '').trim().toUpperCase();
                if (!code) return;
                if (!courseMap[code]) {
                  courseMap[code] = { courseCode: code, courseName: (off.courseName || '').trim(), ltpSet: new Set() };
                }
                if (off.courseName && (!courseMap[code].courseName || courseMap[code].courseName.length < off.courseName.trim().length)) {
                  courseMap[code].courseName = off.courseName.trim();
                }
                if (off.ltp) {
                  const l = off.ltp.trim().toUpperCase();
                  if (l === 'L') courseMap[code].ltpSet.add('Lecture');
                  else if (l === 'T') courseMap[code].ltpSet.add('Tutorial');
                  else if (l === 'P') courseMap[code].ltpSet.add('Lab');
                  else courseMap[code].ltpSet.add(off.ltp);
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

              const uniqueList = Object.values(courseMap);

              return (
                <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {uniqueList.map((off, idx) => (
                    <span key={idx} className="badge badge-neutral" style={{ fontSize: '12px', padding: '4px 10px' }} title={off.courseName ? `${off.courseCode}: ${off.courseName}` : off.courseCode}>
                      <BookOpen size={12} style={{ marginRight: '4px' }} />
                      {off.courseCode}{off.courseName && off.courseName.toUpperCase() !== off.courseCode ? ` - ${off.courseName}` : ''} · {formatLtps(off.ltpSet)}
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
              {ratings?.totalReviews > 0 && ratings?.overallRating ? Number(ratings.overallRating).toFixed(1) : '–'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              <StarRating rating={ratings?.totalReviews > 0 ? Math.round(ratings.overallRating || 0) : 0} readOnly size={16} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {ratings?.totalReviews > 0 ? `Based on ${ratings.totalReviews} student reviews` : 'No ratings yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Login Callout Banner */}
      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>Studied under {teacher.fullName}?</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user
              ? 'Leave an authentic review from your dashboard and help juniors make informed course choices.'
              : 'Log in with your official university email to leave an authentic review and help juniors make informed course choices.'}
          </div>
        </div>
        <button onClick={onLoginClick} className="btn btn-primary btn-sm">
          Rate {firstName}
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
