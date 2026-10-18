import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ALLOWED_BATCHES, ALLOWED_BRANCHES, ALLOWED_ACADEMIC_YEARS } from '../api/client';
import { ReviewCard } from '../components/ReviewCard';
import { StarRating } from '../components/StarRating';
import {
  Award,
  BookOpen,
  Plus,
  Clock,
  TrendingUp,
  MessageSquare,
  Users,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export const TeacherDashboard = ({ onGoHome }) => {
  const { user } = useAuth();

  useEffect(() => {
    const handleHomeReset = () => {
      setShowAddCourse(false);
      setEditingOffering(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('rateprof:navigate-home', handleHomeReset);
    return () => window.removeEventListener('rateprof:navigate-home', handleHomeReset);
  }, []);

  const [ratings, setRatings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Add course offering modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [batchTaught, setBatchTaught] = useState(ALLOWED_BATCHES[0]);
  const [branchTaught, setBranchTaught] = useState('COE');
  const [academicYear, setAcademicYear] = useState(ALLOWED_ACADEMIC_YEARS[0]);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Edit course offering modal
  const [editingOffering, setEditingOffering] = useState(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editBatchTaught, setEditBatchTaught] = useState('');
  const [editBranchTaught, setEditBranchTaught] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchTeacherData = async (isSilentRefresh = false) => {
    if (!user) return;
    if (!isSilentRefresh) setLoading(true);
    try {
      setReviewsPage(1);
      const [ratingsData, reviewsData, offeringsData] = await Promise.all([
        api.getTeacherRatings(user.id).catch(() => null),
        api.getTeacherReviews(user.id, 1).catch(() => ({ reviews: [], totalReviews: 0 })),
        api.getMyOfferings().catch(() => ({ offerings: [] }))
      ]);

      const rObj = ratingsData?.rating || ratingsData || {};
      const revList = reviewsData.reviews || [];

      setRatings({
        overallRating: Number(rObj.overallRating) || 0,
        recentRating: Number(rObj.recentRating) || 0,
        totalReviews: Number(rObj.totalReviews) || revList.length
      });
      setReviews(revList);
      setHasMoreReviews(revList.length < (reviewsData.totalReviews || 0));
      setOfferings(offeringsData.offerings || []);
    } catch (err) {
      console.error("Failed to load teacher data:", err);
    } finally {
      if (!isSilentRefresh) setLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (loadingMore || !hasMoreReviews) return;
    setLoadingMore(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await api.getTeacherReviews(user.id, nextPage);
      const newReviews = res.reviews || [];
      setReviews(prev => [...prev, ...newReviews]);
      setReviewsPage(nextPage);
      setHasMoreReviews(reviews.length + newReviews.length < (res.totalReviews || 0));
    } catch (err) {
      toast.error("Failed to load more reviews");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim() || !batchTaught.trim()) {
      setCourseError("Please fill out all required fields.");
      return;
    }

    setCourseSaving(true);
    setCourseError('');

    try {
      await api.addCourseOffering({
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim(),
        batchTaught: batchTaught.trim().toUpperCase(),
        branchTaught: branchTaught.trim().toUpperCase(),
        academicYear: academicYear.trim()
      });

      setShowAddCourse(false);
      setCourseCode('');
      setCourseName('');
      fetchTeacherData();
    } catch (err) {
      setCourseError(err.message || "Failed to add course offering");
    } finally {
      setCourseSaving(false);
    }
  };

  const openEditModal = (off) => {
    setEditingOffering(off);
    setEditCourseCode(off.courseCode);
    setEditCourseName(off.courseName);
    setEditBatchTaught(off.batchTaught);
    setEditBranchTaught(off.branchTaught);
    setEditAcademicYear(off.academicYear);
    setEditError('');
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editCourseCode.trim() || !editCourseName.trim()) {
      setEditError("Course code and course name are required.");
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      await api.updateCourseOffering(editingOffering.id, {
        courseCode: editCourseCode.trim().toUpperCase(),
        courseName: editCourseName.trim(),
        batchTaught: editBatchTaught.trim().toUpperCase(),
        branchTaught: editBranchTaught.trim().toUpperCase(),
        academicYear: editAcademicYear.trim()
      });

      setEditingOffering(null);
      fetchTeacherData();
    } catch (err) {
      setEditError(err.message || "Failed to update course offering.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteCourse = async (offeringId, courseCode) => {
    if (!window.confirm(`Are you sure you want to delete course offering ${courseCode}?`)) {
      return;
    }

    try {
      await api.deleteCourseOffering(offeringId);
      toast.success("Course offering deleted successfully.");
      fetchTeacherData();
    } catch (err) {
      toast.error(err.message || "Failed to delete course offering.");
    }
  };

  return (
    <div className="main-content">
      {/* Teacher Profile Banner */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>
                {user?.teacherProfile?.fullName || 'Faculty Portal'}
              </h2>
              <span className="badge badge-teacher">
                {user?.teacherProfile?.designation || 'Professor'}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Department of {user?.teacherProfile?.department || 'Engineering'} • Thapar Institute of Engineering & Technology
            </div>
            {user?.teacherProfile?.roomNumber && (
              <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span style={{ fontWeight: 600 }}>Room:</span> {user.teacherProfile.roomNumber}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddCourse(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Add Course / Batch Taught</span>
          </button>
        </div>

        {/* Real-Time Mathematical Rating Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' }}>
          <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Award size={13} />
              <span>Overall Time-Decay Rating</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {ratings?.overallRating ? ratings.overallRating.toFixed(2) : '0.00'}
              </span>
              <StarRating rating={ratings?.overallRating || 0} size={18} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Formula: w = 1 / (1 + age/30)</span>
          </div>

          <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <TrendingUp size={13} />
              <span>Current Semester Score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {ratings?.recentRating ? ratings.recentRating.toFixed(2) : '0.00'}
              </span>
              <StarRating rating={ratings?.recentRating || 0} size={18} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last 180-day rolling evaluation</span>
          </div>

          <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MessageSquare size={13} />
              <span>Total Student Reviews</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
              {reviews.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Transparent student feedback</span>
          </div>
        </div>
      </div>

      {/* Courses & Batches Taught Overview with Edit/Delete */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={16} />
          <span>Your Registered Courses & Batches ({offerings.length})</span>
        </h3>
        {offerings.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            No courses registered yet. Click "Add Course / Batch Taught" to allow students in your batches to find and review you.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {offerings.map((off) => (
              <div
                key={off.id}
                style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border-light)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {off.courseCode}: {off.courseName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Batch <strong>{off.batchTaught}</strong> • {off.branchTaught} • {off.academicYear}
                  </div>
                </div>

                {/* Edit and Delete Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => openEditModal(off)}
                    className="btn btn-subtle btn-sm"
                    title="Edit course offering"
                    style={{ padding: '6px', color: '#1e293b' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(off.id, off.courseCode)}
                    className="btn btn-subtle btn-sm"
                    title="Delete course offering"
                    style={{ padding: '6px', color: '#b91c1c' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Reviews Feed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
            Student Feedback & Reviews ({reviews.length})
          </h3>
          <span className="badge badge-teacher" style={{ fontSize: '12px' }}>
            Faculty Response Enabled
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              No student reviews received yet. As students from your registered batches submit feedback, their transparent reviews and roll numbers will appear here.
            </p>
          </div>
        ) : (
          <>
            {reviews.map((rev) => (
              <ReviewCard
                key={rev.reviewId}
                review={rev}
                onUpdate={() => fetchTeacherData(true)}
              />
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
          </>
        )}
      </div>

      {/* Add Course Offering Modal */}
      {showAddCourse && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Register Course / Batch</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Add a subject and student batch you teach.
                </div>
              </div>
              <button onClick={() => setShowAddCourse(false)} className="btn btn-subtle btn-sm">
                <X size={18} />
              </button>
            </div>

            {courseError && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{courseError}</span>
              </div>
            )}

            <form onSubmit={handleAddCourse}>
              <div className="form-group">
                <label className="form-label">Course Code *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UCS503 or UCS120"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Software Engineering"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Batch Taught *</label>
                  <select
                    className="form-input"
                    value={batchTaught}
                    onChange={(e) => setBatchTaught(e.target.value)}
                  >
                    {ALLOWED_BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Taught *</label>
                  <select
                    className="form-input"
                    value={branchTaught}
                    onChange={(e) => setBranchTaught(e.target.value)}
                  >
                    <option value="COE">COE (Computer)</option>
                    <option value="ECE">ECE (Electronics)</option>
                    <option value="ENC">ENC (Electronics & Computer)</option>
                    <option value="EEC">EEC (Electrical & Computer)</option>
                    <option value="ME">ME (Mechanical)</option>
                    <option value="CE">CE (Civil)</option>
                    <option value="ALL">ALL Branches</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <select
                  className="form-input"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                >
                  {ALLOWED_ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={courseSaving}
                  className="btn btn-primary"
                >
                  {courseSaving ? "Saving..." : "Save Course Offering"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Offering Modal */}
      {editingOffering && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit Course Offering</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Update course details for {editingOffering.courseCode}.
                </div>
              </div>
              <button onClick={() => setEditingOffering(null)} className="btn btn-subtle btn-sm">
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCourse}>
              <div className="form-group">
                <label className="form-label">Course Code *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editCourseCode}
                  onChange={(e) => setEditCourseCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Batch Taught *</label>
                  <select
                    className="form-input"
                    value={editBatchTaught}
                    onChange={(e) => setEditBatchTaught(e.target.value)}
                  >
                    {ALLOWED_BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Taught *</label>
                  <select
                    className="form-input"
                    value={editBranchTaught}
                    onChange={(e) => setEditBranchTaught(e.target.value)}
                  >
                    <option value="COE">COE (Computer)</option>
                    <option value="ECE">ECE (Electronics)</option>
                    <option value="ENC">ENC (Electronics & Computer)</option>
                    <option value="EEC">EEC (Electrical & Computer)</option>
                    <option value="ME">ME (Mechanical)</option>
                    <option value="CE">CE (Civil)</option>
                    <option value="ALL">ALL Branches</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <select
                  className="form-input"
                  value={editAcademicYear}
                  onChange={(e) => setEditAcademicYear(e.target.value)}
                >
                  {ALLOWED_ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setEditingOffering(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn btn-primary"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
