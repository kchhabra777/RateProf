import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { Tag, Sparkles } from 'lucide-react';
import { TeacherAIInsights } from '../components/TeacherAIInsights';
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import {
  Activity, TrendingDown, TrendingUp, ArrowLeft, Download,
  Users, MessageSquare, Star, ChevronRight, Search, AlertTriangle,
  UserPlus, UserX, Edit2, Trash2, CheckCircle2, ShieldBan, RefreshCw,
  Crown, Check, X as XIcon, Calendar, Upload, Layers, BarChart3,
  Award, ShieldAlert, FileText, ArrowUpRight, Flame, ThumbsUp, HelpCircle
} from 'lucide-react';

/* ── tiny helpers ── */
const formatJoinedDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isStudentRecent = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const diffDays = (new Date() - date) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
};

const getRatingColor = (r) => {
  if (r === 0) return '#71717a';
  if (r < 2.5) return '#ef4444';
  if (r < 3.5) return '#f97316';
  if (r < 4.2) return '#eab308';
  return '#22c55e';
};

const RatingBar = ({ value, max = 5 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--border-light)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(value / max) * 100}%`,
        background: getRatingColor(value),
        borderRadius: '99px',
        transition: 'width 0.6s ease'
      }} />
    </div>
    <span style={{ fontSize: '12px', fontWeight: 700, color: getRatingColor(value), minWidth: '28px' }}>
      {value > 0 ? value.toFixed(1) : '—'}
    </span>
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{
        width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
        background: accent + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={18} color={accent} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  </div>
);

export const AdminDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('analytics'); // analytics, faculty, students, register...

  // Phase 1.1: Campus Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  const loadAnalytics = async (dept = 'ALL') => {
    setAnalyticsLoading(true);
    try {
      const res = await api.getCampusAnalytics(dept);
      setAnalyticsData(res);
    } catch (err) {
      console.error("Failed to load campus analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Data
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSortFilter, setStudentSortFilter] = useState('newest'); // 'newest' | 'recent_7d' | 'all' | 'cr_only'
  const [ratingsMap, setRatingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyPage, setFacultyPage] = useState(1);
  const FACULTY_PER_PAGE = 25;

  // Dossier State
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [teacherReviews, setTeacherReviews] = useState([]);
  const [teacherRatings, setTeacherRatings] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [selectedTeacherTags, setSelectedTeacherTags] = useState(null);
  const [addingCourse, setAddingCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    courseCode: '',
    courseName: '',
    batchTaught: '3Q11',
    branchTaught: 'COE',
    academicYear: '2026-2027',
    ltp: 'L'
  });
  const [reviewSort, setReviewSort] = useState('recent');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);

  // Moderation
  
  const [flags, setFlags] = useState([]);
  const [communityTags, setCommunityTags] = useState([]);
  const [tagForm, setTagForm] = useState({ name: '', type: 'POSITIVE', opposite: '' });
  const [editingTagId, setEditingTagId] = useState(null);

  const loadTags = async () => {
    try {
      const res = await api.getAdminTags();
      setCommunityTags(res.tags || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'tags') loadTags();
  }, [activeTab]);

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTagId) {
        await api.updateAdminTag(editingTagId, tagForm);
      } else {
        await api.addAdminTag(tagForm);
      }
      setTagForm({ name: '', type: 'POSITIVE', opposite: '' });
      setEditingTagId(null);
      loadTags();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditTag = (tag) => {
    setEditingTagId(tag.id);
    setTagForm({ name: tag.name, type: tag.type, opposite: tag.opposite || '' });
  };

  const handleDeleteTag = async (id) => {
    if(!window.confirm("Delete this tag?")) return;
    try {
      await api.deleteAdminTag(id);
      loadTags();
    } catch (e) {
      console.error(e);
    }
  };

  const [flagsLoading, setFlagsLoading] = useState(false);

  // Stats
  const [totalReviews, setTotalReviews] = useState(0);
  const [campusAvg, setCampusAvg] = useState(0);

  // Register Teacher Form
  const [regForm, setRegForm] = useState({ fullName: '', email: '', department: '', designation: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState(null);

  // Delete Teacher State
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resTeachers, resStudents, resSummary] = await Promise.all([
        api.getAllTeachers().catch(() => ({ teachers: [] })),
        api.getStudents().catch(() => ({ students: [] })),
        api.getRatingsSummary().catch(() => null)
      ]);

      const tList = resTeachers.teachers || [];
      setStudents(resStudents.students || []);

      let ratings = {};
      let totalR = 0;
      let cAvg = '—';

      if (resSummary && resSummary.ratings) {
        ratings = resSummary.ratings;
        totalR = resSummary.totalReviews || 0;
        cAvg = resSummary.campusAvg || '—';
      }

      tList.sort((a, b) => {
        const idA = a.userId || a.user?.id || a.id;
        const idB = b.userId || b.user?.id || b.id;
        const rA = ratings[idA]?.overallRating || 0, rB = ratings[idB]?.overallRating || 0;
        const nA = ratings[idA]?.totalReviews || 0, nB = ratings[idB]?.totalReviews || 0;
        if (nA === 0 && nB > 0) return 1;
        if (nB === 0 && nA > 0) return -1;
        return rA - rB;
      });

      setTeachers(tList);
      setRatingsMap(ratings);
      setTotalReviews(totalR);
      setCampusAvg(cAvg);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFlags = async (silent = false) => {
    if (!silent) setFlagsLoading(true);
    try {
      const res = await api.getFlags();
      setFlags(res.flags || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setFlagsLoading(false);
    }
  };

  const [studentsLoading, setStudentsLoading] = useState(false);

  const loadStudents = async (silent = false) => {
    if (!silent) setStudentsLoading(true);
    try {
      const res = await api.getStudents();
      setStudents(res.students || []);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      if (!silent) setStudentsLoading(false);
    }
  };

  // Faculty Name Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('PENDING');
  const [suggestionActionLoading, setSuggestionActionLoading] = useState(null);

  const loadSuggestions = async (silent = false) => {
    if (!silent) setSuggestionsLoading(true);
    try {
      const res = await api.getTeacherSuggestions();
      setSuggestions(res.suggestions || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      if (!silent) setSuggestionsLoading(false);
    }
  };

  const handleApproveSuggestion = async (id) => {
    setSuggestionActionLoading(id);
    try {
      await api.approveTeacherSuggestion(id);
      await Promise.all([
        loadSuggestions(true),
        loadData()
      ]);
    } catch (err) {
      alert("Failed to approve suggestion: " + err.message);
    } finally {
      setSuggestionActionLoading(null);
    }
  };

  const handleRejectSuggestion = async (id) => {
    setSuggestionActionLoading(id);
    try {
      await api.rejectTeacherSuggestion(id);
      await loadSuggestions(true);
    } catch (err) {
      alert("Failed to reject suggestion: " + err.message);
    } finally {
      setSuggestionActionLoading(null);
    }
  };

  const handleToggleCR = async (studentUserId) => {
    try {
      const res = await api.toggleStudentCR(studentUserId);
      setStudents(prev => prev.map(s => {
        if (s.id === studentUserId) {
          return {
            ...s,
            studentProfile: {
              ...s.studentProfile,
              isCR: res.profile?.isCR ?? !s.studentProfile?.isCR
            }
          };
        }
        return s;
      }));
    } catch (err) {
      alert("Failed to toggle CR status: " + err.message);
    }
  };

  const pendingSuggestionsCount = suggestions.filter(s => s.status === 'PENDING').length;

  // ── Semester Lifecycle & Rollover State ──
  const [semesterStats, setSemesterStats] = useState(null);
  const [semesterStatsLoading, setSemesterStatsLoading] = useState(false);
  const [rolloverYear, setRolloverYear] = useState('2026-2027 EVEN');
  const [rolloverFileText, setRolloverFileText] = useState('');
  const [rolloverArchivePrev, setRolloverArchivePrev] = useState(true);
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [rolloverResult, setRolloverResult] = useState(null);

  const loadSemesterStats = async () => {
    setSemesterStatsLoading(true);
    try {
      const res = await api.getSemesterStats();
      setSemesterStats(res);
      if (res?.currentSemester) {
        // Suggest the alternate semester
        if (res.currentSemester.includes('ODD')) {
          setRolloverYear(res.currentSemester.replace('ODD', 'EVEN'));
        } else if (res.currentSemester.includes('EVEN')) {
          // Increment year and set to ODD
          setRolloverYear('2027-2028 ODD');
        }
      }
    } catch (err) {
      console.error("Failed to load semester stats:", err);
    } finally {
      setSemesterStatsLoading(false);
    }
  };

  const handleExecuteRollover = async (e) => {
    e.preventDefault();
    if (!rolloverYear.trim()) {
      alert("Please specify the target semester name (e.g., 2026-2027 EVEN)");
      return;
    }

    let parsedOfferings = [];
    if (rolloverFileText.trim()) {
      try {
        if (rolloverFileText.trim().startsWith('[') || rolloverFileText.trim().startsWith('{')) {
          const parsed = JSON.parse(rolloverFileText);
          parsedOfferings = Array.isArray(parsed) ? parsed : (parsed.offerings || []);
        } else {
          // CSV Parser (teacherCode/name, courseCode, courseName, batchTaught, branchTaught)
          const lines = rolloverFileText.trim().split('\n');
          parsedOfferings = lines.map(line => {
            const parts = line.split(',').map(s => s.trim());
            return {
              teacherIdentifier: parts[0] || '',
              courseCode: parts[1] || 'GEN',
              courseName: parts[2] || parts[1] || 'General Course',
              batchTaught: parts[3] || 'ALL',
              branchTaught: parts[4] || 'ALL'
            };
          }).filter(o => o.teacherIdentifier);
        }
      } catch (err) {
        alert("Failed to parse timetable data: " + err.message + "\nPlease provide valid CSV or JSON.");
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to roll over campus to ${rolloverYear}?\n${rolloverArchivePrev ? "Previous semester course offerings will be safely archived." : ""}`)) {
      return;
    }

    setRolloverLoading(true);
    setRolloverResult(null);
    try {
      const res = await api.rolloverSemester({
        newAcademicYear: rolloverYear.trim(),
        offerings: parsedOfferings,
        archivePrevious: rolloverArchivePrev
      });
      setRolloverResult(res);
      await loadSemesterStats();
      await loadData();
    } catch (err) {
      alert("Rollover failed: " + err.message);
    } finally {
      setRolloverLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSuggestions(true);
    loadAnalytics('ALL');
  }, []);

  const [batchRequests, setBatchRequests] = useState([]);
  const [batchRequestsLoading, setBatchRequestsLoading] = useState(false);

  const loadBatchRequests = async (silent = false) => {
    if (!silent) setBatchRequestsLoading(true);
    try {
      const res = await api.getBatchRequests();
      setBatchRequests(res.requests || []);
    } catch (err) {
      console.error("Failed to load batch requests:", err);
    } finally {
      if (!silent) setBatchRequestsLoading(false);
    }
  };

  const handleApproveBatchRequest = async (id) => {
    try {
      await api.approveBatchRequest(id);
      loadBatchRequests(true);
      loadStudents(true);
    } catch (err) {
      alert("Error approving request: " + err.message);
    }
  };

  const handleRejectBatchRequest = async (id) => {
    try {
      await api.rejectBatchRequest(id);
      loadBatchRequests(true);
    } catch (err) {
      alert("Error rejecting request: " + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics(selectedDeptFilter);
    if (activeTab === 'moderation') loadFlags();
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'suggestions') loadSuggestions();
    if (activeTab === 'semester') loadSemesterStats();
    if (activeTab === 'batch-requests') loadBatchRequests();
  }, [activeTab, selectedDeptFilter]);

  const openDossier = async (teacher, isSilentRefresh = false) => {
    setSelectedTeacher(teacher);
    if (!isSilentRefresh) {
      setReviewLoading(true);
      setSelectedTeacherTags(null);
      setReviewsPage(1);
    }
    const id = teacher.userId || teacher.user?.id || teacher.id;
    try {
      const [rRes, ratRes, courseRes, tagsRes] = await Promise.all([
        api.getTeacherReviews(id, 1).catch(() => ({ reviews: [], totalReviews: 0 })),
        api.getTeacherRatings(id).catch(() => null),
        api.getAdminTeacherCourses(id).catch(() => ({ courses: [] })),
        api.getTeacherTagStats(id).catch(() => ({ stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 }))
      ]);
      setTeacherReviews(rRes.reviews || []);
      setHasMoreReviews((rRes.reviews || []).length < (rRes.totalReviews || 0));
      setTeacherRatings(ratRes || { overallRating: 0, recentRating: 0, totalReviews: 0 });
      setTeacherCourses(courseRes.courses || []);
      setSelectedTeacherTags(tagsRes || { stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 });
    } catch (err) {
      console.error("openDossier error:", err);
      setSelectedTeacherTags({ stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 });
    } finally {
      if (!isSilentRefresh) setReviewLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (loadingMoreReviews || !hasMoreReviews || !selectedTeacher) return;
    setLoadingMoreReviews(true);
    try {
      const id = selectedTeacher.userId || selectedTeacher.user?.id || selectedTeacher.id;
      const nextPage = reviewsPage + 1;
      const res = await api.getTeacherReviews(id, nextPage);
      const newReviews = res.reviews || [];
      setTeacherReviews(prev => [...prev, ...newReviews]);
      setReviewsPage(nextPage);
      setHasMoreReviews(teacherReviews.length + newReviews.length < (res.totalReviews || 0));
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      const id = selectedTeacher.userId || selectedTeacher.user?.id || selectedTeacher.id;
      const res = await api.addAdminTeacherCourse(id, newCourse);
      setTeacherCourses(prev => [...prev, res.course]);
      setAddingCourse(false);
      setNewCourse({ courseCode: '', courseName: '', batchTaught: '3Q11', branchTaught: 'COE', academicYear: '2026-2027' });
    } catch (err) {
      alert("Failed to add course: " + err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course allocation?")) return;
    
    const previousCourses = [...teacherCourses];
    setTeacherCourses(prev => prev.filter(c => c.id !== courseId)); // Optimistic UI update
    
    try {
      await api.deleteAdminTeacherCourse(courseId);
    } catch (err) {
      setTeacherCourses(previousCourses); // Rollback on failure
      alert("Failed to delete course: " + err.message);
    }
  };

  const handleResolveFlag = async (flagId, action) => {
    if (action === 'delete_review' && !window.confirm("Are you sure you want to completely delete this review?")) return;
    
    const previousFlags = [...flags];
    setFlags(prev => prev.filter(f => f.flagId !== flagId)); // Optimistic UI update

    try {
      await api.resolveFlag(flagId, action);
    } catch (err) {
      setFlags(previousFlags); // Rollback on failure
      alert("Failed to resolve flag: " + err.message);
    }
  };

  const exportCsv = () => {
    if (!selectedTeacher || !teacherReviews.length) return;
    const hdr = ['Date', 'Rating', 'Reviewer', 'Roll No', 'Batch', 'Course', 'Review', 'Upvotes', 'Downvotes'];
    const rows = teacherReviews.map(r => [
      new Date(r.createdAt).toLocaleDateString(),
      r.rating,
      r.reviewerName || 'Anonymous',
      r.reviewerRollNo || 'N/A',
      r.reviewerBatch || 'N/A',
      r.courseCode || 'N/A',
      `"${(r.reviewText || '').replace(/"/g, '""')}"`,
      r.upvotes || 0,
      r.downvotes || 0
    ]);
    const csv = [hdr.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${selectedTeacher.fullName}_Reviews.csv`;
    a.click();
  };

  const handleBanToggle = async (userId, currentStatus) => {
    try {
      await api.banUser(userId, !currentStatus);
      setStudents(prev => prev.map(s => s.id === userId ? { ...s, isBanned: !currentStatus } : s));
    } catch (err) {
      alert("Failed to update ban status: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteTeacher = async (teacher, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!teacher) return;
    const name = teacher.fullName || teacher.name || 'this faculty member';
    if (!window.confirm(`Are you sure you want to permanently delete ${name} and all their reviews, ratings, and course allocations?\n\nThis action cannot be undone.`)) {
      return;
    }

    const teacherId = teacher.userId || teacher.user?.id || teacher.id;
    const targetId = teacher.id;
    setIsDeletingTeacher(true);

    // Optimistic UI update: instantly remove from list so user sees immediate feedback
    const previousTeachers = [...teachers];
    setTeachers(prev => prev.filter(t => {
      const tUserId = t.userId || t.user?.id;
      const tId = t.id;
      if (teacherId && (tUserId === teacherId || tId === teacherId)) return false;
      if (targetId && tId === targetId) return false;
      return true;
    }));

    if (selectedTeacher) {
      const sId = selectedTeacher.userId || selectedTeacher.user?.id || selectedTeacher.id;
      if (sId === teacherId || selectedTeacher.id === targetId) {
        setSelectedTeacher(null);
        setTeacherReviews([]);
      }
    }

    try {
      await api.deleteTeacher(teacherId);
      // Reload stats and leaderboard silently to keep totals accurate
      loadData();
    } catch (err) {
      setTeachers(previousTeachers);
      alert(err.message || "Failed to delete teacher");
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegMessage(null);
    try {
      await api.adminRegisterTeacher(regForm);
      setRegMessage({ type: 'success', text: "Teacher registered successfully! They can now log in via email to set their password." });
      setRegForm({ fullName: '', email: '', department: '', designation: '' });
      loadData(); // refresh list
    } catch (err) {
      setRegMessage({ type: 'error', text: err.message || "Failed to register teacher" });
    } finally {
      setRegLoading(false);
    }
  };

  const sortedReviews = [...teacherReviews].sort((a, b) => {
    if (reviewSort === 'helpful') {
      const diff = ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0));
      if (diff !== 0) return diff;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredTeachers = teachers.filter(t =>
    !searchQuery ||
    t.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFacultyPages = Math.ceil(filteredTeachers.length / FACULTY_PER_PAGE) || 1;
  const paginatedTeachers = filteredTeachers.slice(
    (facultyPage - 1) * FACULTY_PER_PAGE,
    facultyPage * FACULTY_PER_PAGE
  );

  const filteredStudents = students
    .filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentProfile?.batch?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (studentSortFilter === 'cr_only') return Boolean(s.studentProfile?.isCR);
      if (studentSortFilter === 'recent_7d') {
        const createdAt = s.createdAt || s.studentProfile?.createdAt;
        return isStudentRecent(createdAt);
      }
      return true;
    })
    .sort((a, b) => {
      if (studentSortFilter === 'newest' || studentSortFilter === 'recent_7d') {
        const dateA = new Date(a.createdAt || a.studentProfile?.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.studentProfile?.createdAt || 0).getTime();
        return dateB - dateA; // Newest users first
      }
      return (a.studentProfile?.fullName || a.email || '').localeCompare(b.studentProfile?.fullName || b.email || '');
    });

  const atRisk = teachers.filter(t => {
    const id = t.userId || t.user?.id || t.id;
    const r = ratingsMap[id];
    return r?.totalReviews > 0 && r?.overallRating < 3;
  }).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading campus data…</span>
      </div>
    );
  }

  return (
    <div className="admin-layout fade-in">
      {/* ── Sidebar Navigation ── */}
      <aside className="admin-sidebar">
        <div style={{ marginBottom: '24px', paddingLeft: '14px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Admin Panel</h2>
        </div>

        <button className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setSelectedTeacher(null); }}>
          <BarChart3 size={18} />
          <span>Analytics & Insights</span>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'var(--primary)', color: '#fff', marginLeft: 'auto' }}>
            NAAC
          </span>
        </button>
        
        <button className={`admin-nav-item ${activeTab === 'faculty' ? 'active' : ''}`} onClick={() => { setActiveTab('faculty'); setSelectedTeacher(null); setSearchQuery(''); setFacultyPage(1); }}>
          <Users size={18} />
          Faculty Leaderboard
        </button>
        
        <button className={`admin-nav-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => { setActiveTab('students'); setSelectedTeacher(null); setSearchQuery(''); }}>
          <Activity size={18} />
          Manage Students
        </button>
        
        <button className={`admin-nav-item ${activeTab === 'batch-requests' ? 'active' : ''}`} onClick={() => { setActiveTab('batch-requests'); setSelectedTeacher(null); }}>
          <FileText size={18} />
          Batch Requests
        </button>

        <button className={`admin-nav-item ${activeTab === 'register' ? 'active' : ''}`} onClick={() => { setActiveTab('register'); setSelectedTeacher(null); }}>
          <UserPlus size={18} />
          Register Teacher
        </button>


        <button className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`} onClick={() => { setActiveTab('moderation'); setSelectedTeacher(null); }}>
          <ShieldBan size={18} />
          Moderation
        </button>

        <button className={`admin-nav-item ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => { setActiveTab('suggestions'); setSelectedTeacher(null); }}>
          <Sparkles size={18} />
          <span style={{ flex: 1, textAlign: 'left' }}>Faculty Suggestions</span>
          {pendingSuggestionsCount > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '1px 7px',
              borderRadius: '99px', background: '#f59e0b', color: '#18181b'
            }}>
              {pendingSuggestionsCount}
            </span>
          )}
        </button>

        <button className={`admin-nav-item ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => { setActiveTab('tags'); setSelectedTeacher(null); }}>
          <Activity size={18} />
          Community Tags
        </button>

        <button className={`admin-nav-item ${activeTab === 'semester' ? 'active' : ''}`} onClick={() => { setActiveTab('semester'); setSelectedTeacher(null); }}>
          <Calendar size={18} />
          Semester Rollover
        </button>
      </aside>


      {/* ── Main Content Area ── */}
      <main className="admin-main">
        {/* ── Page Header ── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            {activeTab === 'analytics' && "Campus Analytics & Academic Insights"}
            {activeTab === 'faculty' && "Faculty Leaderboard"}
            {activeTab === 'students' && "Manage Students"}
            {activeTab === 'suggestions' && "Faculty Name Suggestions"}
            {activeTab === 'register' && "Register New Teacher"}
            {activeTab === 'moderation' && "Moderation Queue"}
            {activeTab === 'tags' && "Community Tags"}
            {activeTab === 'semester' && "Semester Lifecycle & Timetable Rollover"}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {activeTab === 'analytics' && "Comprehensive pedagogical metrics, department benchmarking, NPS sentiment, and NAAC Student Satisfaction data."}
            {activeTab === 'faculty' && "View ratings, reviews, and remove faculty accounts."}
            {activeTab === 'students' && "Search and ban/unban student accounts."}
            {activeTab === 'suggestions' && "Approve student & CR submitted faculty names. Approving updates the professor's name campus-wide."}
            {activeTab === 'register' && "Create an account for a faculty member. They will set their password via email OTP."}
            {activeTab === 'moderation' && "Review and resolve flagged content reported by students."}
            {activeTab === 'tags' && "Manage positive and constructive community tags."}
            {activeTab === 'semester' && "Manage 6-month semester transitions. Archive previous allocations and bulk import new courses & batches."}
          </p>
        </div>

        {/* ── Phase 1.1: Campus Analytics Tab ── */}
        {activeTab === 'analytics' && (
          <div className="fade-in">
            {/* Header controls: Department Filter + Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Filter Department:
                </span>
                <select 
                  className="form-input" 
                  style={{ width: '240px', height: '40px', fontSize: '13.5px', fontWeight: 600 }}
                  value={selectedDeptFilter}
                  onChange={(e) => {
                    setSelectedDeptFilter(e.target.value);
                    loadAnalytics(e.target.value);
                  }}
                >
                  <option value="ALL">All Campus Departments</option>
                  <option value="CSED">Computer Science & Engg (CSED)</option>
                  <option value="Engineering Department">Core Engineering</option>
                  <option value="COE">COE Department</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => loadAnalytics(selectedDeptFilter)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={analyticsLoading}
                >
                  <RefreshCw size={14} style={{ animation: analyticsLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                  Refresh Analytics
                </button>

                <button 
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                  <Download size={14} />
                  Print / Export NAAC Report
                </button>
              </div>
            </div>

            {analyticsLoading && !analyticsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Synthesizing campus analytics...</span>
              </div>
            ) : analyticsData ? (
              <div>
                {/* ── 4 Key Institutional KPI Stat Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  <StatCard 
                    icon={Star} 
                    label="Campus Avg Rating" 
                    value={analyticsData.metrics.campusAvgRating > 0 ? analyticsData.metrics.campusAvgRating.toFixed(2) : "—"} 
                    sub="Time-decay weighted score" 
                    accent="#f59e0b" 
                  />
                  <StatCard 
                    icon={Users} 
                    label="Student Response Rate" 
                    value={`${analyticsData.metrics.responseRate}%`} 
                    sub="Active reviewers vs enrolled" 
                    accent="#22c55e" 
                  />
                  <StatCard 
                    icon={Award} 
                    label="Campus NPS Score" 
                    value={`${analyticsData.metrics.npsScore > 0 ? '+' : ''}${analyticsData.metrics.npsScore}`} 
                    sub={`${analyticsData.metrics.promotersPercentage}% Promoters / ${analyticsData.metrics.detractorsPercentage}% Detractors`} 
                    accent="#8b5cf6" 
                  />
                  <StatCard 
                    icon={ShieldAlert} 
                    label="Intervention Alerts" 
                    value={analyticsData.metrics.atRiskCount} 
                    sub="Faculty below 3.0 threshold" 
                    accent="#ef4444" 
                  />
                </div>

                {/* ── Visual Charts Row 1: Trends & Rating Distribution ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  {/* Rating Trend Chart */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          📈 Pedagogical Rating Trend
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          Campus-wide monthly evaluation averages across courses
                        </p>
                      </div>
                      <span className="badge" style={{ fontSize: '12px', background: 'var(--primary-subtle)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                        Last 6 Months
                      </span>
                    </div>

                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.monthlyTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} />
                          <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[1, 5]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                            formatter={(val) => [`${val} ★`, 'Avg Score']}
                          />
                          <Area type="monotone" dataKey="avgRating" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRating)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Rating Breakdown Bar */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          📊 Rating Score Distribution
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          Percentage breakdown across {analyticsData.metrics.totalReviews} student reviews
                        </p>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Total: {analyticsData.metrics.totalReviews}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                      {analyticsData.ratingDistribution.map(item => (
                        <div key={item.stars} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '65px', color: 'var(--text-primary)' }}>
                            {item.stars}
                          </span>
                          <div style={{ flex: 1, height: '10px', borderRadius: '99px', background: 'var(--border-light)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${item.percentage}%`,
                              background: item.color,
                              borderRadius: '99px',
                              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, minWidth: '40px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {item.percentage}%
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '50px', textAlign: 'right' }}>
                            ({item.count})
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontWeight: 700 }}>
                        <span>Promoters (4-5★):</span>
                        <span>{analyticsData.metrics.promotersPercentage}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', fontWeight: 700 }}>
                        <span>Passives (3★):</span>
                        <span>{analyticsData.metrics.passivesPercentage}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700 }}>
                        <span>Detractors (1-2★):</span>
                        <span>{analyticsData.metrics.detractorsPercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Visual Charts Row 2: Department Comparisons & Top Community Tags ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  {/* Department Comparison Bar Chart */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          🏛️ Department Quality Benchmarks
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          Comparative student satisfaction by academic division
                        </p>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.departmentComparisons} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} vertical={false} />
                          <XAxis 
                            dataKey="department" 
                            tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} 
                            axisLine={false} 
                            tickLine={false}
                            interval={0}
                            angle={-10}
                            textAnchor="end"
                          />
                          <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                            formatter={(val, name) => [`${val} ★`, 'Avg Department Score']}
                          />
                          <Bar dataKey="avgRating" radius={[6, 6, 0, 0]} barSize={34}>
                            {analyticsData.departmentComparisons.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.avgRating >= 4 ? '#22c55e' : entry.avgRating >= 3.5 ? '#3b82f6' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Community Tags Frequency */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          🏷️ Qualitative Campus Themes
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          Most frequently submitted student feedback tags
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      {analyticsData.topTags.map(tag => {
                        const isPositive = !['Tough Grader', 'Heavy Workload', 'Confusing Lectures', 'Boring Lectures', 'Rarely Available'].includes(tag.name);
                        return (
                          <div 
                            key={tag.name} 
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: isPositive ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                              background: isPositive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(249, 115, 22, 0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700, color: isPositive ? '#166534' : '#9a3412' }}>
                                #{tag.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {tag.percentage}% of reviews
                              </div>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: isPositive ? '#16a34a' : '#ea580c' }}>
                              {tag.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Section: Review Activity Calendar Heatmap & Action Items ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  {/* Activity Heatmap */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        🗓️ Review Submission Velocity
                      </h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Daily student submission activity over the last 28 days
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                      {analyticsData.weeklyHeatmap.map((cell, idx) => {
                        const bgColors = [
                          'var(--bg-card-subtle)',
                          '#fed7aa',
                          '#fb923c',
                          '#ea580c'
                        ];
                        return (
                          <div 
                            key={cell.date}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              backgroundColor: bgColors[cell.level],
                              border: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: cell.level > 1 ? '#fff' : 'var(--text-muted)',
                              cursor: 'pointer'
                            }}
                            title={`${cell.date} (${cell.day}): ${cell.count} reviews submitted`}
                          >
                            {cell.count > 0 ? cell.count : ''}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <span>Less</span>
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'var(--bg-card-subtle)', border: '1px solid var(--border-light)' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#fed7aa' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#fb923c' }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#ea580c' }} />
                      <span>More Activity</span>
                    </div>
                  </div>

                  {/* Quality Assurance Action Alert Feed */}
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          ⚠️ Pedagogical Action Alerts
                        </h3>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          Prioritized faculty support and commendation list
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {analyticsData.atRiskFaculty.slice(0, 3).map(f => (
                        <div 
                          key={f.id} 
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991b1b' }}>
                              🔴 Review Needed: {f.fullName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                              {f.department} · {f.totalReviews} reviews
                            </div>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>
                            {f.overallRating.toFixed(1)} ★
                          </span>
                        </div>
                      ))}

                      {analyticsData.topFaculty.slice(0, 2).map(f => (
                        <div 
                          key={f.id} 
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>
                              ⭐ Commendation: {f.fullName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#15803d' }}>
                              {f.department} · Outstanding Student Feedback
                            </div>
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>
                            {f.overallRating.toFixed(1)} ★
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Faculty Tab ── */}
        {activeTab === 'faculty' && !selectedTeacher && (
          <div className="fade-in">
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <StatCard icon={Users}         label="Total Faculty"     value={teachers.length}  sub="Registered this semester"   accent="#3b82f6" />
              <StatCard icon={MessageSquare} label="Reviews Submitted" value={totalReviews}      sub="Campus-wide student feedback" accent="#8b5cf6" />
              <StatCard icon={Star}          label="Campus Avg Rating" value={campusAvg}          sub="Across all rated faculty"    accent="#f59e0b" />
              <StatCard icon={AlertTriangle} label="Needs Attention"   value={atRisk}             sub="Faculty below 3.0 rating"   accent="#ef4444" />
            </div>

            {/* Search */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '36px', width: '280px', fontSize: '14px', height: '40px' }}
                  placeholder="Search faculty or dept…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setFacultyPage(1); }}
                />
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', padding: '12px 20px', background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', gap: '16px' }}>
                <span>Faculty Member</span>
                <span>Overall Rating</span>
                <span>Reviews</span>
                <span>Actions</span>
                <span></span>
              </div>

              {filteredTeachers.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No matching faculty found.</div>
              ) : (
                paginatedTeachers.map((teacher, idx) => {
                  const id = teacher.userId || teacher.user?.id || teacher.id;
                  const r = ratingsMap[id] || { overallRating: 0, totalReviews: 0 };
                  const needsAttention = r.totalReviews > 0 && r.overallRating < 3;

                  return (
                    <div key={id}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', padding: '16px 20px', borderBottom: idx < paginatedTeachers.length - 1 ? '1px solid var(--border-light)' : 'none', alignItems: 'center', gap: '16px', transition: 'background 0.12s', cursor: 'pointer', background: needsAttention ? 'rgba(239,68,68,0.04)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = needsAttention ? 'rgba(239,68,68,0.08)' : 'var(--bg-card-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = needsAttention ? 'rgba(239,68,68,0.04)' : 'transparent'}
                      onClick={() => openDossier(teacher)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {needsAttention && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} title="Needs attention" />}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{teacher.fullName}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{teacher.department}</div>
                        </div>
                      </div>
                      <div><RatingBar value={r.overallRating} /></div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: r.totalReviews === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {r.totalReviews === 0 ? '—' : `${r.totalReviews} reviews`}
                      </div>
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <button 
                          type="button"
                          className="btn btn-subtle btn-sm" 
                          style={{ color: '#ef4444', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={(e) => handleDeleteTeacher(teacher, e)} 
                          title="Remove Teacher"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  );
                })
              )}

              {/* Pagination controls */}
              {filteredTeachers.length > FACULTY_PER_PAGE && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--bg-card-subtle)',
                  fontSize: '13px',
                  color: 'var(--text-muted)'
                }}>
                  <div>
                    Showing {(facultyPage - 1) * FACULTY_PER_PAGE + 1}–{Math.min(facultyPage * FACULTY_PER_PAGE, filteredTeachers.length)} of {filteredTeachers.length} faculty
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn btn-subtle btn-sm"
                      style={{ border: '1px solid var(--border-light)', padding: '6px 12px' }}
                      disabled={facultyPage === 1}
                      onClick={() => setFacultyPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', padding: '0 6px' }}>
                      Page {facultyPage} of {totalFacultyPages}
                    </span>
                    <button
                      className="btn btn-subtle btn-sm"
                      style={{ border: '1px solid var(--border-light)', padding: '6px 12px' }}
                      disabled={facultyPage >= totalFacultyPages}
                      onClick={() => setFacultyPage(p => Math.min(totalFacultyPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Dossier View (Inside Faculty Tab) ── */}
        {activeTab === 'faculty' && selectedTeacher && (
          <div className="fade-in">
            <button className="btn btn-subtle btn-sm" style={{ marginBottom: '24px', paddingLeft: '0' }} onClick={() => { setSelectedTeacher(null); setTeacherReviews([]); }}>
              <ArrowLeft size={16} /> Back to Leaderboard
            </button>

            <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{selectedTeacher.fullName}</h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{selectedTeacher.designation} · {selectedTeacher.department}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setIsAIInsightsOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <BarChart3 size={14} />
                    Generate Feedback Analytics
                  </button>
                  <button onClick={exportCsv} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '6px' }}><Download size={14} /> Export CSV</button>
                  <button 
                    type="button"
                    onClick={(e) => handleDeleteTeacher(selectedTeacher, e)} 
                    className="btn btn-secondary btn-sm" 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}
                    title="Remove this faculty member"
                    disabled={isDeletingTeacher}
                  >
                    <Trash2 size={14} /> {isDeletingTeacher ? 'Removing...' : 'Remove Faculty'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '28px' }}>
                {[
                  { label: 'Overall Rating', value: teacherRatings?.overallRating || 0 },
                  { label: 'Recent Rating (180d)', value: teacherRatings?.recentRating || 0 },
                  { label: 'Total Reviews', value: teacherRatings?.totalReviews || 0, noBar: true }
                ].map(({ label, value, noBar }) => (
                  <div key={label} className="stat-box">
                    <div className="stat-label">{label}</div>
                    {noBar ? <div className="stat-value" style={{ fontSize: '28px' }}>{value}</div> : (
                      <>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: getRatingColor(value), marginBottom: '10px' }}>{value > 0 ? value.toFixed(2) : '—'}</div>
                        <RatingBar value={value} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Course Allocations</h3>
                {!addingCourse && (
                  <button onClick={() => setAddingCourse(true)} className="btn btn-primary btn-sm">
                    + Add Course
                  </button>
                )}
              </div>

              {addingCourse && (
                <form onSubmit={handleAddCourse} style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-default)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <input type="text" className="form-input" placeholder="Course Code" value={newCourse.courseCode} onChange={e => setNewCourse({ ...newCourse, courseCode: e.target.value })} required />
                    <input type="text" className="form-input" placeholder="Course Name" value={newCourse.courseName} onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })} required />
                    <select className="form-input" value={newCourse.ltp} onChange={e => setNewCourse({ ...newCourse, ltp: e.target.value })}>
                      <option value="L">Lecture (L)</option>
                      <option value="T">Tutorial (T)</option>
                      <option value="P">Practical (P)</option>
                    </select>
                    <input type="text" className="form-input" placeholder="Batch" value={newCourse.batchTaught} onChange={e => setNewCourse({ ...newCourse, batchTaught: e.target.value })} required />
                    <input type="text" className="form-input" placeholder="Branch" value={newCourse.branchTaught} onChange={e => setNewCourse({ ...newCourse, branchTaught: e.target.value })} required />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setAddingCourse(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm">Save Allocation</button>
                  </div>
                </form>
              )}

              {teacherCourses.length === 0 && !addingCourse ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No courses allocated to this teacher yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {teacherCourses.map(course => (
                    <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-default)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{course.courseCode} - {course.courseName} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({course.ltp || 'L'})</span></div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Batch: {course.batchTaught} • Branch: {course.branchTaught} • Year: {course.academicYear}</div>
                      </div>
                      <button onClick={() => handleDeleteCourse(course.id)} className="btn btn-subtle btn-sm" style={{ color: '#ef4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Community Tags</h3>
            {selectedTeacherTags && selectedTeacherTags.sufficientData && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Based on {selectedTeacherTags.totalReviewsWithTags} reviews
              </p>
            )}
            
            {reviewLoading || !selectedTeacherTags ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', padding: '12px 0' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span>Loading tag statistics...</span>
              </div>
            ) : !selectedTeacherTags.sufficientData ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', marginTop: '12px' }}>
                {selectedTeacherTags.needed > 0
                  ? `${selectedTeacherTags.needed} more review${selectedTeacherTags.needed > 1 ? 's' : ''} needed to unlock tag insights for this teacher.`
                  : 'No student tags submitted for this teacher yet.'}
              </div>
            ) : selectedTeacherTags.stats?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', marginTop: '12px' }}>
                No community tags recorded for this faculty member yet.
              </div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={selectedTeacherTags.stats}
                    margin={{ top: 10, right: 40, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.7}/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      width={170}
                      tick={{ fill: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                      contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(val) => [`${val}%`, 'Frequency']}
                    />
                    <Bar 
                      dataKey="percentage" 
                      radius={[4, 4, 4, 4]} 
                      barSize={16} 
                      background={{ fill: 'rgba(255,255,255,0.04)', radius: [4, 4, 4, 4] }}
                      label={{ position: 'right', fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, formatter: (val) => `${val}%` }}
                    >
                      {selectedTeacherTags.stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Official Review Records ({sortedReviews.length})</h3>
              <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                {['recent', 'helpful'].map(mode => (
                  <button key={mode} onClick={() => setReviewSort(mode)} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: reviewSort === mode ? 'var(--primary)' : 'transparent', color: reviewSort === mode ? '#fff' : 'var(--text-secondary)' }}>
                    {mode === 'recent' ? 'Most Recent' : 'Highest Liked'}
                  </button>
                ))}
              </div>
            </div>

            {reviewLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading reviews…</div>
            ) : sortedReviews.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No reviews submitted yet.</div>
            ) : (
              <>
                {sortedReviews.map(rev => <ReviewCard key={rev.reviewId} review={rev} onUpdate={() => openDossier(selectedTeacher, true)} />)}
                {hasMoreReviews && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={loadMoreReviews}
                      disabled={loadingMoreReviews}
                    >
                      {loadingMoreReviews ? 'Loading...' : 'Load More Reviews'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Students Tab ── */}
        {activeTab === 'students' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="form-input" style={{ paddingLeft: '36px', width: '260px', height: '40px' }} placeholder="Search name, roll no, or email…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'inline-flex', background: 'var(--bg-card-subtle)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-light)', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setStudentSortFilter('newest')}
                    className="btn btn-sm"
                    style={{
                      background: studentSortFilter === 'newest' ? 'var(--primary)' : 'transparent',
                      color: studentSortFilter === 'newest' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Newest Users</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSortFilter('recent_7d')}
                    className="btn btn-sm"
                    style={{
                      background: studentSortFilter === 'recent_7d' ? 'var(--primary)' : 'transparent',
                      color: studentSortFilter === 'recent_7d' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Calendar size={13} />
                    <span>Joined Last 7d</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSortFilter('all')}
                    className="btn btn-sm"
                    style={{
                      background: studentSortFilter === 'all' ? 'var(--primary)' : 'transparent',
                      color: studentSortFilter === 'all' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    All Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSortFilter('cr_only')}
                    className="btn btn-sm"
                    style={{
                      background: studentSortFilter === 'cr_only' ? 'var(--primary)' : 'transparent',
                      color: studentSortFilter === 'cr_only' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    👑 CRs
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => loadStudents()}
                  disabled={studentsLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} style={{ animation: studentsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{studentsLoading ? 'Loading…' : 'Refresh'}</span>
                </button>
                <div className="badge" style={{ fontSize: '13px' }}><Users size={15}/> {filteredStudents.length} Students</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 0.9fr auto', padding: '12px 20px', background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', gap: '16px' }}>
                <span>Student</span>
                <span>Roll Number</span>
                <span>Joined</span>
                <span>Batch CR Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {studentsLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading student records…</div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</div>
              ) : (
                filteredStudents.map((student, idx) => {
                  const isCR = !!student.studentProfile?.isCR;
                  const createdAt = student.createdAt || student.studentProfile?.createdAt;
                  const isRecent = isStudentRecent(createdAt);
                  return (
                    <div key={student.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 0.9fr auto', padding: '16px 20px', borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border-light)' : 'none', alignItems: 'center', gap: '16px', background: student.isBanned ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px' }}>{student.studentProfile?.fullName || 'Incomplete Profile'}</span>
                          {isRecent && (
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '6px',
                              fontSize: '10px',
                              padding: '1px 6px',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{student.email}</div>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{student.studentProfile?.rollNumber || '—'}</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: isRecent ? '#10b981' : 'var(--text-primary)' }}>
                          {formatJoinedDate(createdAt)}
                        </div>
                        {createdAt && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleToggleCR(student.id)}
                          className="btn btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isCR ? '#fef3c7' : 'var(--bg-card-subtle)',
                            color: isCR ? '#b45309' : 'var(--text-muted)',
                            border: isCR ? '1px solid #fcd34d' : '1px solid var(--border-light)',
                            fontWeight: 700,
                            borderRadius: '16px',
                            padding: '4px 10px',
                            cursor: 'pointer'
                          }}
                          title={isCR ? "Revoke Class Representative Status" : "Designate as Class Representative"}
                        >
                          <span>{isCR ? '👑 Batch CR' : '☆ Make CR'}</span>
                        </button>
                      </div>
                      <div>
                        {student.isBanned ? (
                          <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}><ShieldBan size={12}/> Suspended</span>
                        ) : (
                          <span className="badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}><CheckCircle2 size={12}/> Active</span>
                        )}
                      </div>
                      <div>
                        <button className="btn btn-secondary btn-sm" style={{ minWidth: '100px', borderColor: student.isBanned ? '#bbf7d0' : '#fecaca', color: student.isBanned ? '#166534' : '#b91c1c' }} onClick={() => handleBanToggle(student.id, student.isBanned)}>
                          {student.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Batch Requests Tab ── */}
        {activeTab === 'batch-requests' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Student Batch Change Requests</h2>
              <button
                onClick={() => loadBatchRequests()}
                disabled={batchRequestsLoading}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} style={{ animation: batchRequestsLoading ? 'spin 1s linear infinite' : 'none' }} />
                <span>{batchRequestsLoading ? 'Refreshing…' : 'Refresh List'}</span>
              </button>
            </div>

            {batchRequestsLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading batch requests…</div>
            ) : batchRequests.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No batch change requests found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {batchRequests.map(req => (
                  <div key={req.id} className="card" style={{ padding: '20px', borderLeft: req.status === 'PENDING' ? '4px solid #f59e0b' : (req.status === 'APPROVED' ? '4px solid #10b981' : '4px solid #ef4444') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ 
                            padding: '4px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '16px',
                            background: req.status === 'PENDING' ? '#fef3c7' : (req.status === 'APPROVED' ? '#d1fae5' : '#fee2e2'),
                            color: req.status === 'PENDING' ? '#d97706' : (req.status === 'APPROVED' ? '#059669' : '#b91c1c')
                          }}>
                            {req.status}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>
                            {req.studentName || req.studentRollNo || 'Student'}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                              (Roll: {req.studentRollNo || 'N/A'})
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', marginTop: '4px' }}>
                            <strong>Requested:</strong> Batch {req.requestedBatch} {req.requestedBranch ? `(${req.requestedBranch})` : ''}
                          </div>
                        </div>

                        {req.reason && (
                          <div style={{ background: 'var(--bg-default)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <strong>Reason:</strong> {req.reason}
                          </div>
                        )}
                        {req.crEmail && (
                          <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-muted)' }}>
                            <strong>Verified by CR:</strong> {req.crEmail}
                          </div>
                        )}
                      </div>

                      {req.status === 'PENDING' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '140px' }}>
                          <button onClick={() => handleApproveBatchRequest(req.id)} className="btn btn-primary btn-sm" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                            <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> Approve
                          </button>
                          <button onClick={() => handleRejectBatchRequest(req.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fecaca' }}>
                            <XIcon size={14} style={{ marginRight: '6px' }} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Register Teacher Tab ── */}
        {activeTab === 'register' && (
          <div className="fade-in">
            <div className="card" style={{ maxWidth: '500px', padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Teacher Details</h2>
              
              {regMessage && (
                <div className={regMessage.type === 'error' ? 'alert-error' : 'alert-success'} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}>
                  {regMessage.text}
                </div>
              )}

              <form onSubmit={handleRegisterTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input required className="form-input" value={regForm.fullName} onChange={e => setRegForm({...regForm, fullName: e.target.value})} placeholder="Dr. John Doe" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Official Thapar Email</label>
                  <input required type="email" className="form-input" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="bv.raghav@thapar.edu" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Department</label>
                  <select required className="form-select" value={regForm.department} onChange={e => setRegForm({...regForm, department: e.target.value})}>
                    <option value="">Select Department</option>
                    <option value="Computer Science and Engineering">CSED</option>
                    <option value="Mechanical Engineering">MED</option>
                    <option value="Electrical and Instrumentation">EIED</option>
                    <option value="Civil Engineering">CED</option>
                    <option value="Mathematics">SOM</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Designation</label>
                  <select required className="form-select" value={regForm.designation} onChange={e => setRegForm({...regForm, designation: e.target.value})}>
                    <option value="">Select Designation</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={regLoading} style={{ marginTop: '8px', padding: '12px' }}>
                  {regLoading ? 'Registering...' : 'Register Teacher Account'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Moderation Tab ── */}
        {activeTab === 'moderation' && (
          <div className="fade-in">
            {flagsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading flags…</div>
            ) : flags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: '#10b981' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>All Clear!</h3>
                <p>No reported reviews to moderate.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {flags.map(flag => (
                  <div key={flag.flagId} className="card" style={{ padding: '24px', borderLeft: flag.status === 'PENDING' ? '4px solid #ef4444' : '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: flag.status === 'PENDING' ? '#fef2f2' : '#ecfdf5', color: flag.status === 'PENDING' ? '#ef4444' : '#10b981', fontSize: '12px', fontWeight: 700, borderRadius: 'var(--radius-full)', marginBottom: '12px' }}>
                          <AlertTriangle size={14} style={{ marginRight: '6px' }} />
                          {flag.status}
                        </div>
                        
                        <div style={{ marginBottom: '16px', background: 'var(--bg-default)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Reported Content</div>
                          {flag.review ? (
                            <>
                              <div style={{ fontSize: '14px', marginBottom: '8px' }}>"{flag.review.reviewText}"</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Posted by: {flag.review.reviewerName} • Course: {flag.review.courseCode || 'N/A'} • {new Date(flag.review.createdAt).toLocaleDateString()}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Review has been deleted.</div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Reporter Details</div>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                            <span style={{ fontWeight: 600 }}>{flag.reporterDetails?.name || flag.reporterId}</span> 
                            {flag.reporterDetails?.rollNo && ` (${flag.reporterDetails.rollNo})`}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Reason: <span style={{ fontWeight: 500 }}>{flag.reason}</span>
                          </div>
                        </div>
                      </div>

                      {flag.status === 'PENDING' && flag.review && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
                          <button onClick={() => handleResolveFlag(flag.flagId, 'dismiss')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                            Dismiss (Keep Review)
                          </button>
                          <button onClick={() => handleResolveFlag(flag.flagId, 'delete_review')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
                            <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete Review
                          </button>
                          {flag.review.reviewerId && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to ban ${flag.review.reviewerName || 'this student'}?`)) {
                                  try {
                                    await api.banUser(flag.review.reviewerId, true);
                                    alert("Reviewer has been banned.");
                                    loadStudents();
                                  } catch (err) {
                                    alert("Failed to ban student: " + (err.message || "Unknown error"));
                                  }
                                }
                              }}
                              className="btn btn-sm"
                              style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600, padding: '6px 12px' }}
                            >
                              <ShieldBan size={14} style={{ marginRight: '6px' }} /> Ban Reviewer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      
        {activeTab === 'tags' && (
          <div className="admin-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Manage Tags</h3>
              
              <form onSubmit={handleTagSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Tag Name</label>
                  <input className="form-input" required value={tagForm.name} onChange={e => setTagForm({...tagForm, name: e.target.value})} placeholder="e.g. Clear Explanations" />
                </div>
                <div style={{ width: '150px' }}>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})}>
                    <option value="POSITIVE">Positive</option>
                    <option value="CONSTRUCTIVE">Constructive</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Opposite (Optional)</label>
                  <input className="form-input" value={tagForm.opposite} onChange={e => setTagForm({...tagForm, opposite: e.target.value})} placeholder="e.g. Confusing Lectures" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 20px' }}>
                  {editingTagId ? 'Update Tag' : 'Add Tag'}
                </button>
                {editingTagId && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingTagId(null); setTagForm({ name: '', type: 'POSITIVE', opposite: '' }); }} style={{ height: '42px', padding: '0 20px' }}>Cancel</button>
                )}
              </form>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tag Name</th>
                      <th>Type</th>
                      <th>Opposite</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communityTags.map(tag => (
                      <tr key={tag.id}>
                        <td style={{ fontWeight: 500 }}>{tag.name}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                            background: tag.type === 'POSITIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: tag.type === 'POSITIVE' ? '#22c55e' : '#ef4444'
                          }}>
                            {tag.type}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{tag.opposite || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleEditTag(tag)} style={{ color: 'var(--text-secondary)', marginRight: '16px' }} title="Edit"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteTag(tag.id)} style={{ color: '#ef4444' }} title="Delete"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {communityTags.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No tags found. Add some!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Faculty Suggestions Tab ── */}
        {activeTab === 'suggestions' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Crowdsourced Faculty Suggestions</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Review submissions from students and Batch CRs to identify unnamed faculty codes.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                  {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
                    <button
                      key={f}
                      onClick={() => setSuggestionFilter(f)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: suggestionFilter === f ? 'var(--primary)' : 'transparent',
                        color: suggestionFilter === f ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadSuggestions()}
                  disabled={suggestionsLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} style={{ animation: suggestionsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.2fr 1fr auto', padding: '12px 20px', background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-light)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', gap: '16px' }}>
                <span>Current Initial / Code</span>
                <span>Suggested Full Name</span>
                <span>Submitted By</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {suggestionsLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading suggestions…</div>
              ) : suggestions.filter(s => suggestionFilter === 'ALL' || s.status === suggestionFilter).length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No {suggestionFilter.toLowerCase()} faculty suggestions found.
                </div>
              ) : (
                suggestions
                  .filter(s => suggestionFilter === 'ALL' || s.status === suggestionFilter)
                  .map((sug, idx, arr) => (
                    <div
                      key={sug.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.5fr 1.2fr 1fr auto',
                        padding: '16px 20px',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--border-light)' : 'none',
                        alignItems: 'center',
                        gap: '16px',
                        background: sug.isCRVerified ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{sug.teacher?.fullName || 'Code Profile'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sug.teacher?.department}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sug.suggestedName && (
                          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>
                            {sug.suggestedName}
                          </div>
                        )}
                        {sug.suggestedDept && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Dept:</span> {sug.suggestedDept}
                          </div>
                        )}
                        {(sug.suggestedCourseCode || sug.courseCode) && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Course:</span>
                            <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '1px 6px' }}>
                              {sug.suggestedCourseCode || sug.courseCode} {sug.suggestedLtp ? `(${sug.suggestedLtp})` : ''}
                            </span>
                            {sug.suggestedCourseName && (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>• {sug.suggestedCourseName}</span>
                            )}
                          </div>
                        )}
                        {(sug.suggestedBatchTaught || sug.suggestedBranchTaught) && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Batch:</span> {sug.suggestedBatchTaught || 'Any'} {sug.suggestedBranchTaught ? `(${sug.suggestedBranchTaught})` : ''}
                          </div>
                        )}
                        {sug.suggestedRoomNo && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>Room:</span> {sug.suggestedRoomNo}
                          </div>
                        )}
                        {sug.suggestedThaparProfileUrl && (
                          <div style={{ fontSize: '12.5px' }}>
                            <a href={sug.suggestedThaparProfileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                              Thapar Profile Link
                            </a>
                          </div>
                        )}
                        {sug.suggestedLinkedIn && (
                          <div style={{ fontSize: '12.5px' }}>
                            <a href={sug.suggestedLinkedIn} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', textDecoration: 'underline' }}>
                              LinkedIn Link
                            </a>
                          </div>
                        )}
                        {sug.suggestedPhotoUrl && (
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Photo:</span>
                            <img src={sug.suggestedPhotoUrl} alt="Suggested Profile" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-light)' }} />
                          </div>
                        )}
                        {sug.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px', padding: '4px 8px', background: 'var(--bg-subtle)', borderRadius: '4px' }}>
                            Notes: "{sug.notes}"
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {sug.studentName || 'Student'} ({sug.studentRollNo || 'N/A'})
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sug.studentEmail}</div>
                        {sug.isCR && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', marginTop: '4px' }}>
                            👑 Verified CR ({sug.batch || 'Batch'})
                          </span>
                        )}
                      </div>
                      <div>
                        <span
                          className="badge"
                          style={{
                            background: sug.status === 'APPROVED' ? '#f0fdf4' : sug.status === 'REJECTED' ? '#fef2f2' : '#fefce8',
                            color: sug.status === 'APPROVED' ? '#166534' : sug.status === 'REJECTED' ? '#b91c1c' : '#854d0e',
                            border: `1px solid ${sug.status === 'APPROVED' ? '#bbf7d0' : sug.status === 'REJECTED' ? '#fecaca' : '#fef08a'}`
                          }}
                        >
                          {sug.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {sug.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveSuggestion(sug.id)}
                              disabled={suggestionActionLoading === sug.id}
                              className="btn btn-primary btn-sm"
                              style={{ background: '#16a34a', borderColor: '#16a34a' }}
                            >
                              {suggestionActionLoading === sug.id ? 'Saving…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectSuggestion(sug.id)}
                              disabled={suggestionActionLoading === sug.id}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626' }}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ── Semester Lifecycle & Rollover Tab ── */}
        {activeTab === 'semester' && (
          <div className="fade-in">
            {/* Status overview cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard
                icon={Calendar}
                label="Active Semester"
                value={semesterStats?.currentSemester || "2026-2027 ODD"}
                sub="Current live teaching session"
                accent="#3b82f6"
              />
              <StatCard
                icon={Layers}
                label="Active Offerings"
                value={semesterStats?.activeOfferings || 0}
                sub="Courses active this semester"
                accent="#10b981"
              />
              <StatCard
                icon={Activity}
                label="Archived Offerings"
                value={semesterStats?.archivedOfferings || 0}
                sub="Preserved historical records"
                accent="#8b5cf6"
              />
            </div>

            {/* Rollover Result Alert */}
            {rolloverResult && (
              <div style={{ padding: '16px 20px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{rolloverResult.message}</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Archived: {rolloverResult.details?.archivedPreviousOfferings || 0} previous courses | 
                    Created: {rolloverResult.details?.newOfferingsCreated || 0} new course allocations.
                  </div>
                </div>
                <button onClick={() => setRolloverResult(null)} className="btn btn-secondary btn-sm">Dismiss</button>
              </div>
            )}

            {/* Transition Form Card */}
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Initiate 6-Month Semester Transition</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Roll over the campus to a new academic term (e.g. July Odd → January Even). Past reviews and ratings are preserved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSemesterStats}
                  disabled={semesterStatsLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} style={{ animation: semesterStatsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh Stats</span>
                </button>
              </div>

              <form onSubmit={handleExecuteRollover} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Target Academic Semester Name
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={rolloverYear}
                    onChange={e => setRolloverYear(e.target.value)}
                    placeholder="e.g. 2026-2027 EVEN or 2027-2028 ODD"
                    style={{ maxWidth: '400px' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    This label tags all course allocations and student eligibility queries.
                  </span>
                </div>

                <div style={{ padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={rolloverArchivePrev}
                      onChange={e => setRolloverArchivePrev(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Archive previous semester allocations (Recommended)</span>
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 26px' }}>
                    Marks active allocations as previous term records. Historical reviews remain linked to the professor and their courses.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Timetable Allocations (Paste CSV or JSON format) — Optional
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    CSV format per line: <code>TeacherCodeOrName, CourseCode, CourseName, BatchTaught, BranchTaught</code><br />
                    Example: <code>AMH, UCS415, Design and Analysis of Algorithms, 3C1, COE</code>
                  </p>
                  <textarea
                    className="form-input"
                    rows={8}
                    value={rolloverFileText}
                    onChange={e => setRolloverFileText(e.target.value)}
                    placeholder="AMH, UCS415, Design and Analysis of Algorithms, 3C1, COE&#10;TA20, UCS414, Computer Networks, 3C2, COE&#10;..."
                    style={{ fontFamily: 'monospace', fontSize: '12.5px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={rolloverLoading}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontWeight: 700 }}
                  >
                    {rolloverLoading ? 'Executing Semester Transition…' : `Activate ${rolloverYear}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>



    
      {isAIInsightsOpen && selectedTeacher && (
        <TeacherAIInsights 
          teacherId={selectedTeacher.userId || selectedTeacher.id || selectedTeacher.user?.id}
          teacherName={selectedTeacher.fullName || selectedTeacher.name}
          onClose={() => setIsAIInsightsOpen(false)}
        />
      )}

      
</div>
  );
};
