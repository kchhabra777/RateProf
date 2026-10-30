import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, OFFICIAL_ELECTIVES, getElectiveName, isFreeElective } from '../api/client';
import { TeacherCard } from '../components/TeacherCard';
import { ReviewCard } from '../components/ReviewCard';
import { WriteReviewModal } from '../components/WriteReviewModal';
import { StarRating } from '../components/StarRating';
import {
  Users,
  BookOpen,
  Award,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  TrendingUp,
  MessageSquarePlus,
  Info,
  Crown,
  ExternalLink,
  Share2,
  Edit3,
  User,
  Trophy,
  HeartHandshake,
  Star
} from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { updatePageSEO, buildTeacherSchema } from '../utils/seo';
import { SuggestTeacherModal } from '../components/SuggestTeacherModal';
import { ThaparProfileLink } from '../components/ThaparProfileLink';
import { getTeacherPhoto } from '../utils/teacherMedia';
import { TeacherAIInsights } from '../components/TeacherAIInsights';
// recharts is ~110 kB gzipped and only used for this chart, so it loads with the chart
const TagStatsChart = lazy(() => import('../components/TagStatsChart'));
import CloudLoader from '../components/ui/quantum-cloud-loader';
import { Marquee } from '../components/ui/marquee';
import { TAG_THEMES } from '../lib/tagTheme';
import BorderBeam from '../components/ui/border-beam';
import AnimatedTabs from '../components/ui/animated-tabs';
import NumberTicker from '../components/ui/number-ticker';
import CommandMenu from '../components/ui/command-menu';
import { ShareProfileModal } from '../components/ShareProfileModal';
import { MobileNav } from '../components/MobileNav';
import { PeerSupportFeed } from '../components/PeerSupportFeed';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';


const TEACHER_PAGE_SIZE = 24;

export const StudentDashboard = ({ onGoHome }) => {
  const { user, onboardStudent, setUser } = useAuth();
  const [tab, setTab] = useState('eligible'); // 'eligible' | 'all'
  const [mobileTab, setMobileTab] = useState('directory'); // 'directory' | 'feed' | 'leaderboard' | 'profile'
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [eligibleTeachers, setEligibleTeachers] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [teacherRatingsMap, setTeacherRatingsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Electives state (Dual electives: EL-1 and Free Elective)
  const studentYear = user?.studentProfile?.yearOfStudy || 1;
  const studentElectives = user?.studentProfile?.selectedElectives || [];
  const currentDisciplineElective = studentElectives.find(code => !isFreeElective(code)) || '';
  const currentFreeElective = studentElectives.find(code => isFreeElective(code)) || '';

  const [isElectiveModalOpen, setIsElectiveModalOpen] = useState(false);
  const [modalDisciplineElective, setModalDisciplineElective] = useState(currentDisciplineElective);
  const [modalFreeElective, setModalFreeElective] = useState(currentFreeElective);
  const [savingElective, setSavingElective] = useState(false);
  const [availableElectives, setAvailableElectives] = useState([]);

  useEffect(() => {
    api.getElectives().then(res => {
      if (res.electives) setAvailableElectives(res.electives);
    }).catch(e => console.warn("Could not load electives in dashboard:", e));
  }, []);

  useEffect(() => {
    setModalDisciplineElective(currentDisciplineElective);
    setModalFreeElective(currentFreeElective);
  }, [currentDisciplineElective, currentFreeElective]);

  // Selected teacher view (viewing reviews)
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedTeacherReviews, setSelectedTeacherReviews] = useState([]);
  const [selectedTeacherRatings, setSelectedTeacherRatings] = useState(null);
  const [selectedTeacherTags, setSelectedTeacherTags] = useState(null);

  const displayTeacherTagStats = useMemo(() => {
    if (!selectedTeacherTags?.stats) return [];
    const standardTags = [
      'Clear Explanations',
      'Approachable',
      'Engaging Lectures',
      'Heavy Workload',
      'Tough Grader'
    ];
    const map = new Map(selectedTeacherTags.stats.map(s => [s.name, s]));
    standardTags.forEach(name => {
      if (!map.has(name)) {
        map.set(name, { name, count: 0, percentage: 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return standardTags.indexOf(a.name) - standardTags.indexOf(b.name);
    });
  }, [selectedTeacherTags]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState('recent');
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);
  const [isCmdMenuOpen, setIsCmdMenuOpen] = useState(false);

  // Write review modal
  const [reviewingTeacher, setReviewingTeacher] = useState(null);

  // Suggest teacher name modal
  const [suggestTeacher, setSuggestTeacher] = useState(null);
  const [suggestionToast, setSuggestionToast] = useState(null);

  // Share teacher modal
  const [sharingTeacher, setSharingTeacher] = useState(null);

  // Change batch modal
  const studentBatch = user?.studentProfile?.batch || user?.detectedBatch || '3Q11';
  const rawBranch = user?.studentProfile?.branch || 'COE';
  const branchMatch = rawBranch.match(/\(([^)]+)\)/);
  let studentBranch = branchMatch ? branchMatch[1] : rawBranch;

  // Hardcode branch mappings based on batch letter for display
  if (studentBatch.includes('Q')) {
    studentBranch = 'COPC';
  } else if (studentBatch.includes('C') && !studentBatch.includes('COPC')) {
    studentBranch = 'COE';
  }
  const studentRollNo = user?.studentProfile?.rollNumber || '';

  const isStudentCR = Boolean(user?.studentProfile?.isCR);
  const unverifiedBatchFaculty = eligibleTeachers.filter(t => 
    Boolean(
      t.fullName?.startsWith("Teacher (") ||
      t.code === t.fullName ||
      /^[A-Z0-9]{2,5}$/.test(t.fullName?.trim() || '')
    )
  );

  const [isChangeBatchOpen, setIsChangeBatchOpen] = useState(false);
  const [newBatchInput, setNewBatchInput] = useState('');
  const [newBranchInput, setNewBranchInput] = useState(studentBranch);
  const [changeReason, setChangeReason] = useState('');
  const [crEmailInput, setCrEmailInput] = useState('');
  const [targetRollNoInput, setTargetRollNoInput] = useState('');
  const [myBatchRequests, setMyBatchRequests] = useState([]);
  const [updatingBatch, setUpdatingBatch] = useState(false);
  const [batchUpdateMsg, setBatchUpdateMsg] = useState('');
  
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.getStudentLeaderboard();
      setLeaderboard(res.leaderboard || []);
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    }
  };

  const userRank = React.useMemo(() => {
    const mine = leaderboard?.find(s => s.isYou);
    return mine ? mine.rank : null;
  }, [leaderboard]);

  const fetchMyBatchRequests = async () => {
    try {
      const res = await api.getMyBatchRequests();
      setMyBatchRequests(res.requests || []);
    } catch (e) {
      console.error("Failed to fetch batch requests:", e);
    }
  };

  const handleUpdateBatchSubmit = async (e) => {
    e.preventDefault();
    if (!newBatchInput) return;
    setUpdatingBatch(true);
    setBatchUpdateMsg('');
    try {
      const res = await api.requestBatchChange({
        requestedBatch: newBatchInput,
        requestedBranch: newBranchInput,
        reason: changeReason,
        crEmail: crEmailInput,
        targetRollNo: isStudentCR ? targetRollNoInput : undefined
      });
      setBatchUpdateMsg('✅ ' + (res.message || 'Batch change request submitted for Admin verification!'));
      fetchMyBatchRequests();
      setTimeout(() => {
        setIsChangeBatchOpen(false);
        setBatchUpdateMsg('');
      }, 1800);
    } catch (err) {
      toast.error(err.message || 'Failed to submit batch change request');
    } finally {
      setUpdatingBatch(false);
    }
  };

  const handleSaveElective = async () => {
    setSavingElective(true);
    try {
      const electivesToSave = [];
      if (modalDisciplineElective) electivesToSave.push(modalDisciplineElective);
      if (modalFreeElective) electivesToSave.push(modalFreeElective);

      await api.updateStudentElectives(electivesToSave);
      const refreshed = await api.getMe();
      if (refreshed?.user) setUser(refreshed.user);
      setIsElectiveModalOpen(false);

      const parts = [];
      if (modalDisciplineElective) parts.push(`EL-1: ${modalDisciplineElective}`);
      if (modalFreeElective) parts.push(`Free: ${modalFreeElective}`);
      toast.success(parts.length > 0 ? `Enrolled in ${parts.join(' & ')}!` : "Electives set to Core Only.");
      
      const eligibleRes = await api.getEligibleTeachers(studentBatch, studentBranch, electivesToSave).catch(() => ({ teachers: [] }));
      setEligibleTeachers(eligibleRes.teachers || []);
    } catch (err) {
      toast.error(err.message || "Failed to update electives");
    } finally {
      setSavingElective(false);
    }
  };

  const fetchDashboardData = async (isInitial = false) => {
    // Only show full loading spinner if we don't have teachers cached yet
    if (isInitial && allTeachers.length === 0) {
      setLoading(true);
    }
    try {
      // 1. Fetch eligible teachers passing studentElectives
      const eligibleRes = await api.getEligibleTeachers(studentBatch, studentBranch, studentElectives).catch(() => ({ teachers: [] }));
      setEligibleTeachers(eligibleRes.teachers || []);

      // 2. Fetch all teachers and ratings summary in parallel
      const [allRes, summaryRes] = await Promise.all([
        api.getAllTeachers().catch(() => ({ teachers: [] })),
        api.getRatingsSummary().catch(() => null)
      ]);
      
      const allT = allRes.teachers || [];
      if (summaryRes?.ratings) {
        setTeacherRatingsMap(summaryRes.ratings);
      } else {
        const ratMap = {};
        const limitedT = allT.slice(0, 15);
        await Promise.all(limitedT.map(async (t) => {
          const id = t.userId || t.user?.id || t.id;
          try {
            const r = await api.getTeacherRatings(id);
            ratMap[id] = r.rating || { overallRating: 0, recentRating: 0, totalReviews: 0 };
          } catch {
            ratMap[id] = { overallRating: 0, recentRating: 0, totalReviews: 0 };
          }
        }));
        setTeacherRatingsMap(ratMap);
      }
      setAllTeachers(allT);
    } catch (err) {
      console.error("Fetch dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    fetchMyBatchRequests();
    fetchLeaderboard();
  }, [user?.id, studentBatch, studentBranch]);

  // Global Command+K / Ctrl+K shortcut for quick search & actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Tab Switch with browser history push
  const handleTabChange = (newTab) => {
    if (newTab !== mobileTab) {
      if (newTab !== 'directory') {
        window.history.pushState({ appNavigation: true, view: 'tab', tab: newTab }, '');
      }
      setMobileTab(newTab);
    }
  };

  // Back to directory that keeps browser history in sync
  const handleBackToDirectory = () => {
    setSelectedTeacher(null);
    if (window.location.pathname !== '/') {
      window.history.pushState({ appNavigation: true, view: 'directory' }, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to homepage whenever the RateProf logo / Home action is triggered
  useEffect(() => {
    const handleHomeReset = () => {
      setSelectedTeacher(null);
      setSearchQuery('');
      setMobileTab('directory');
      setTab('eligible');
      setIsAIInsightsOpen(false);
      setReviewingTeacher(null);
      setSuggestTeacher(null);
      setSharingTeacher(null);
      setIsChangeBatchOpen(false);
      setIsCmdMenuOpen(false);
      setShowChangePassword(false);
      setIsElectiveModalOpen(false);
      if (window.location.pathname !== '/') {
        window.history.pushState({ appNavigation: true, view: 'directory' }, '', '/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('rateprof:navigate-home', handleHomeReset);
    return () => window.removeEventListener('rateprof:navigate-home', handleHomeReset);
  }, []);

  const openAIInsights = () => {
    window.history.pushState({ appNavigation: true, view: 'ai_insights' }, '');
    setIsAIInsightsOpen(true);
  };

  const openWriteReview = (teacher) => {
    window.history.pushState({ appNavigation: true, view: 'write_review' }, '');
    setReviewingTeacher(teacher);
  };

  const openSuggestTeacher = (teacher) => {
    window.history.pushState({ appNavigation: true, view: 'suggest_teacher' }, '');
    setSuggestTeacher(teacher);
  };

  const openShareTeacher = (teacher) => {
    window.history.pushState({ appNavigation: true, view: 'share_teacher' }, '');
    setSharingTeacher(teacher);
  };

  const openBatchChange = () => {
    setNewBatchInput(studentBatch);
    setNewBranchInput(studentBranch);
    setBatchUpdateMsg('');
    window.history.pushState({ appNavigation: true, view: 'change_batch' }, '');
    setIsChangeBatchOpen(true);
  };

  // Browser Back & Forward Buttons (top arrow navigation)
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event?.state;

      // 1. Close open modals first
      if (isAIInsightsOpen) {
        setIsAIInsightsOpen(false);
        return;
      }
      if (reviewingTeacher) {
        setReviewingTeacher(null);
        return;
      }
      if (suggestTeacher) {
        setSuggestTeacher(null);
        return;
      }
      if (sharingTeacher) {
        setSharingTeacher(null);
        return;
      }
      if (isChangeBatchOpen) {
        setIsChangeBatchOpen(false);
        return;
      }
      if (isCmdMenuOpen) {
        setIsCmdMenuOpen(false);
        return;
      }

      // 2. Browser forward navigation to teacher
      if (state?.view === 'teacher' && state?.id) {
        const found = state.teacher ||
          allTeachers.find(t => (t.id || t.userId) === state.id) ||
          eligibleTeachers.find(t => (t.id || t.userId) === state.id);
        if (found) {
          handleViewReviews(found, true);
        } else {
          handleViewReviews({ id: state.id, userId: state.id, fullName: 'Faculty Profile' }, true);
        }
        return;
      }

      // 3. Browser navigation to tab
      if (state?.view === 'tab' && state?.tab) {
        setMobileTab(state.tab);
        setSelectedTeacher(null);
        return;
      }

      // 4. Browser back navigation: returning to directory / home
      if (!state || state.view === 'directory' || window.location.pathname === '/') {
        if (selectedTeacher) {
          setSelectedTeacher(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (mobileTab !== 'directory') {
          setMobileTab('directory');
        }
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isAIInsightsOpen,
    reviewingTeacher,
    suggestTeacher,
    sharingTeacher,
    isChangeBatchOpen,
    isCmdMenuOpen,
    selectedTeacher,
    mobileTab,
    allTeachers,
    eligibleTeachers
  ]);

  const handleViewReviews = async (teacher, isSilentRefresh = false) => {
    setSelectedTeacher(teacher);
    if (!isSilentRefresh) {
      window.history.pushState(
        { appNavigation: true, view: 'teacher', id: teacher.id || teacher.userId, teacher },
        '',
        `/teacher/${encodeURIComponent(teacher.id || teacher.userId)}`
      );
      setReviewsLoading(true);
      setSelectedTeacherTags(null);
      setReviewsPage(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const teacherId = teacher.userId || teacher.user?.id || teacher.id;
    try {
      const [reviewsRes, ratingRes, tagsRes] = await Promise.all([
        api.getTeacherReviews(teacherId, 1).catch(() => ({ reviews: [], totalReviews: 0 })),
        api.getTeacherRatings(teacherId).catch(() => null),
        api.getTeacherTagStats(teacherId).catch(() => ({ stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 }))
      ]);
      const rObj = ratingRes?.rating || ratingRes || {};
      const reviewsList = reviewsRes.reviews || [];
      setSelectedTeacherReviews(reviewsList);
      setHasMoreReviews(reviewsList.length < (reviewsRes.totalReviews || 0));
      const newRatings = {
        overallRating: Number(rObj.overallRating) || 0,
        recentRating: Number(rObj.recentRating) || 0,
        totalReviews: Number(rObj.totalReviews) || reviewsList.length
      };
      setSelectedTeacherRatings(newRatings);
      setSelectedTeacherTags(tagsRes || { stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 });

      // Dynamically update SEO and Rich Results Schema
      updatePageSEO({
        title: `${teacher.fullName} Reviews, Ratings & Courses | RateProf`,
        description: `Read verified student feedback, ratings, and course allocations for ${teacher.fullName} (${teacher.department}) at Thapar University.`,
        url: `https://www.rateprof.tech/teacher/${encodeURIComponent(teacher.id || teacher.userId)}`,
        schema: buildTeacherSchema(teacher, newRatings)
      });
    } catch (err) {
      console.error("Fetch reviews error:", err);
      setSelectedTeacherTags({ stats: [], totalReviewsWithTags: 0, sufficientData: false, needed: 5 });
    } finally {
      if (!isSilentRefresh) setReviewsLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    if (loadingMoreReviews || !hasMoreReviews || !selectedTeacher) return;
    setLoadingMoreReviews(true);
    try {
      const teacherId = selectedTeacher.userId || selectedTeacher.user?.id || selectedTeacher.id;
      const nextPage = reviewsPage + 1;
      const res = await api.getTeacherReviews(teacherId, nextPage);
      const newReviews = res.reviews || [];
      setSelectedTeacherReviews(prev => [...prev, ...newReviews]);
      setReviewsPage(nextPage);
      setHasMoreReviews(selectedTeacherReviews.length + newReviews.length < (res.totalReviews || 0));
    } catch (err) {
      toast.error("Failed to load more reviews");
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const handleReviewSubmitted = () => {
    fetchDashboardData();
    if (selectedTeacher) {
      handleViewReviews(selectedTeacher, true);
    }
  };

  const displayedTeachers = (tab === 'eligible' ? eligibleTeachers : allTeachers).filter((t) => {
    const name = t.fullName || '';
    const dept = t.department || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || dept.toLowerCase().includes(query);
  });

  // "All Campus Faculty" has 200+ cards; building them all at once froze the page for ~0.4 s.
  // Render them in batches and add the next batch as the user scrolls near the end.
  const [visibleTeacherCount, setVisibleTeacherCount] = useState(TEACHER_PAGE_SIZE);
  const loadMoreTeachersRef = useRef(null);
  useEffect(() => {
    setVisibleTeacherCount(TEACHER_PAGE_SIZE);
  }, [tab, searchQuery]);
  const hasMoreTeachers = visibleTeacherCount < displayedTeachers.length;
  useEffect(() => {
    const sentinel = loadMoreTeachersRef.current;
    if (!sentinel || !hasMoreTeachers) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleTeacherCount((c) => c + TEACHER_PAGE_SIZE);
    }, { rootMargin: '800px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreTeachers, visibleTeacherCount]);

  const sortedReviews = [...selectedTeacherReviews].sort((a, b) => {
    if (reviewSort === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else {
      const aHelpful = (a.upvotes || 0) - (a.downvotes || 0);
      const bHelpful = (b.upvotes || 0) - (b.downvotes || 0);
      if (bHelpful !== aHelpful) return bHelpful - aHelpful;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <div className="main-content">
      {/* Student Welcome Card (on phones only on the Faculty tab; the Profile tab has the same details) */}
      <div className={`card${mobileTab !== 'directory' ? ' mobile-hidden' : ''}`} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
                {user?.studentProfile?.fullName || 'Student Feedback Portal'}
              </h2>
              <span className="badge badge-verified">
                Roll: {studentRollNo}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Batch <strong>{studentBatch}</strong> • Branch <strong>{studentBranch}</strong> • Year <strong>{studentYear}</strong></span>
              <button
                onClick={openBatchChange}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px', height: '24px' }}
                title="Request a batch change if your tutorial/lab was reshuffled"
              >
                Request Batch Change
              </button>

              <span style={{ color: 'var(--border-light)' }}>•</span>

              {studentYear >= 3 ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px' }}>
                    EL-1: <strong style={{ color: currentDisciplineElective ? 'var(--primary)' : 'var(--text-secondary)' }}>{currentDisciplineElective ? `${currentDisciplineElective}` : 'None'}</strong>
                  </span>
                  <span style={{ color: 'var(--border-light)' }}>•</span>
                  <span style={{ fontSize: '13px' }}>
                    Free: <strong style={{ color: currentFreeElective ? '#10b981' : 'var(--text-secondary)' }}>{currentFreeElective ? `${currentFreeElective}` : 'None'}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setModalDisciplineElective(currentDisciplineElective);
                      setModalFreeElective(currentFreeElective);
                      setIsElectiveModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11.5px', height: '24px' }}
                    title="Select or change your Discipline and Free electives"
                  >
                    Change Electives
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }} title="1st & 2nd Year have fixed core subjects with no electives">
                  Electives: <em>None (Core Only)</em>
                </span>
              )}
            </div>
          </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Top Helpers Rank Field */}
              <button
                type="button"
                onClick={() => handleTabChange('leaderboard')}
                className="badge"
                style={{
                  background: userRank ? (userRank <= 3 ? '#fefce8' : '#eff6ff') : '#f8fafc',
                  color: userRank ? (userRank <= 3 ? '#854d0e' : '#1d4ed8') : '#475569',
                  border: userRank ? (userRank <= 3 ? '1px solid #fef08a' : '1px solid #bfdbfe') : '1px solid #e2e8f0',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: userRank && userRank <= 3 ? '0 2px 8px rgba(234, 179, 8, 0.2)' : 'none',
                  transition: 'all 0.2s',
                }}
                title="Click to view Top Helpers Leaderboard"
              >
                <Trophy size={14} color={userRank ? (userRank <= 3 ? '#eab308' : '#3b82f6') : '#94a3b8'} />
                {userRank ? `Rank #${userRank} Top Helper` : 'Top Helpers Leaderboard'}
              </button>

              <span className="badge" style={{ background: '#fdf4ff', color: '#a21caf', border: '1px solid #fbcfe8', padding: '8px 14px', fontSize: '13px' }}>
                <Sparkles size={14} style={{ marginRight: '6px' }} />
                {user?.studentProfile?.xp || 0} XP
              </span>
              <span className="badge badge-neutral" style={{ padding: '8px 14px', fontSize: '13px' }}>
                <NumberTicker value={eligibleTeachers.length} decimalPlaces={0} /> Eligible Teachers Taught You
              </span>
            </div>
        </div>
      </div>

      {myBatchRequests.filter(req => req.status === 'PENDING').length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {myBatchRequests.filter(req => req.status === 'PENDING').map(req => (
            <div key={req.id} style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#d97706',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div>
                <strong>Batch Change Request:</strong> Requested {req.requestedBatch} ({req.requestedBranch}). Awaiting Admin Approval.
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Tabs (Hidden on mobile) */}
      <div className="desktop-tabs" style={{ 
        gap: '12px', 
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '12px'
      }}>
        <button 
          onClick={() => handleTabChange('directory')}
          className={`btn ${mobileTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Search size={16} /> Faculty
        </button>
        <button 
          onClick={() => handleTabChange('feed')}
          className={`btn ${mobileTab === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <HeartHandshake size={16} /> Peer Support
        </button>
        <button 
          onClick={() => handleTabChange('leaderboard')}
          className={`btn ${mobileTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Award size={16} /> Top Helpers
        </button>
        <button 
          onClick={() => handleTabChange('profile')}
          className={`btn ${mobileTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <User size={16} /> My Profile
        </button>
      </div>

      {/* View switching based on Mobile Tab */}
      {mobileTab === 'feed' ? (
        <PeerSupportFeed />
      ) : mobileTab === 'leaderboard' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card-subtle)' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award color="#eab308" /> Top Helpers Leaderboard
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Recognizing students providing academic guidance and detailed feedback. Updated daily.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ background: '#fdf4ff', color: '#a21caf', border: '1px solid #fbcfe8' }}>
                Your XP: {user?.studentProfile?.xp || 0}
              </span>
            </div>
          </div>
          
          {leaderboard.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No helpers yet. Be the first to earn XP by reviewing courses or helping in the feed!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', padding: '16px 20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ width: '30px', textAlign: 'center' }}>Rank</span>
              <span>Student</span>
              <span style={{ minWidth: '80px', textAlign: 'right' }}>XP</span>
            </div>
          )}
          
          {leaderboard.map((student, idx) => (
            <div key={student.rank} style={{ 
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', 
              padding: '16px 20px', alignItems: 'center',
              background: student.isYou ? 'var(--bg-card-subtle)' : 'transparent',
              borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border-light)' : 'none'
            }}>
              <div style={{ width: '30px', textAlign: 'center', fontSize: '16px', fontWeight: 800, color: idx < 3 ? '#eab308' : 'var(--text-secondary)' }}>
                #{student.rank}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {student.fullName || student.initials}
                  {student.isYou && <span className="badge" style={{ fontSize: '10px', padding: '2px 6px' }}>You</span>}
                </div>
                {student.branch && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {student.branch}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#a21caf', textAlign: 'right', minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <div>
                  {student.xp} <span style={{ fontSize: '12px', fontWeight: 600 }}>XP</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : mobileTab === 'profile' ? (
        <div className="student-profile-grid">
          {/* Identity Card (full-width header on desktop) */}
          <div className="card student-profile-identity" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #b91c1c, #991b1b)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '22px',
              flexShrink: 0
            }}>
              {(user?.studentProfile?.fullName || user?.fullName || 'S').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {user?.studentProfile?.fullName || 'Student Profile'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                <span className="badge badge-student">Roll: {studentRollNo || '—'}</span>
                <span className="badge">{studentBranch}</span>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>Batch {studentBatch}</span>
              </div>
            </div>
            <div className="student-profile-stats">
              <div className="student-profile-stat">
                <span>Year</span>
                <strong>{studentYear}</strong>
              </div>
              <div className="student-profile-stat">
                <span>XP</span>
                <strong style={{ color: '#a21caf' }}>{user?.studentProfile?.xp || 0}</strong>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('leaderboard')}
                className="student-profile-stat"
                title="Click to view Top Helpers Leaderboard"
              >
                <span>Helper Rank</span>
                <strong>{userRank ? `#${userRank}` : '—'}</strong>
              </button>
            </div>
          </div>

          {/* Academic Settings Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Academic Group</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Assigned curriculum and faculty directory batch
                </p>
              </div>
              <button 
                onClick={() => setIsChangeBatchOpen(true)}
                className="btn btn-secondary btn-sm"
              >
                <Edit3 size={14} /> Change Batch
              </button>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Sub-Section:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{studentBatch} ({studentBranch})</strong>
            </div>

            <div style={{ background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Discipline Elective (EL-1): </span>
                  <strong style={{ color: currentDisciplineElective ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {currentDisciplineElective ? `${currentDisciplineElective} - ${getElectiveName(currentDisciplineElective)}` : (studentYear >= 3 ? 'None (Core Only)' : 'None (1st & 2nd Year Core)')}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Free Elective (Open): </span>
                  <strong style={{ color: currentFreeElective ? '#10b981' : 'var(--text-primary)' }}>
                    {currentFreeElective ? `${currentFreeElective} - ${getElectiveName(currentFreeElective)}` : (studentYear >= 3 ? 'None (Core Only)' : 'None (1st & 2nd Year Core)')}
                  </strong>
                </div>
                {studentYear >= 3 && (
                  <button
                    onClick={() => {
                      setModalDisciplineElective(currentDisciplineElective);
                      setModalFreeElective(currentFreeElective);
                      setIsElectiveModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <Edit3 size={12} /> Change Electives
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Account Security</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Manage your account password with email verification
                </p>
              </div>
              <button 
                onClick={() => setShowChangePassword(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <KeyRound size={14} /> Change Password
              </button>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Registered Email:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <strong style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{user?.email}</strong>
                <span style={{ fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '99px' }}>Verified</span>
              </div>
            </div>
          </div>
        </div>
      ) : selectedTeacher ? (
        <div>
          <button
            onClick={handleBackToDirectory}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '16px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Teachers Directory</span>
          </button>

          {/* Teacher Profile Summary Banner */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="profile-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div className="profile-header-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div className="profile-avatar-container">
                  <img
                    src={
                      getTeacherPhoto(selectedTeacher) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeacher.fullName || selectedTeacher.code || 'Faculty')}&background=2563eb&color=fff&bold=true`
                    }
                    alt={selectedTeacher.fullName}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      border: '4px solid var(--bg-card)'
                    }}
                    onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeacher.fullName || selectedTeacher.code || 'Faculty')}&background=2563eb&color=fff&bold=true`;
                  }}
                />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span>{selectedTeacher.fullName}</span>
                    {selectedTeacher.code && !selectedTeacher.fullName.includes(selectedTeacher.code) && (
                      <span className="badge badge-neutral" style={{ fontSize: '12px', padding: '2px 8px' }}>
                        {selectedTeacher.code}
                      </span>
                    )}
                  </h2>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedTeacher.designation} • {selectedTeacher.department}
                  </div>
                  {selectedTeacher.roomNumber && (
                    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span style={{ fontWeight: 600 }}>Room:</span> {selectedTeacher.roomNumber}
                    </div>
                  )}
                  
                  {/* Courses Tags — grouped by UNIQUE course taught by the teacher */}
                  {(() => {
                    const allTeacherData = allTeachers.find(t => 
                      (t.id && (t.id === selectedTeacher.id || t.id === selectedTeacher.userId)) ||
                      (t.userId && (t.userId === selectedTeacher.id || t.userId === selectedTeacher.userId))
                    );
                    const rawOfferings = [
                      ...(allTeacherData?.offerings || []),
                      ...(selectedTeacher.offerings || []),
                      ...(selectedTeacher.courses || [])
                    ];
                    if (rawOfferings.length === 0) return null;
                    
                    const courseMap = {};
                    rawOfferings.forEach(c => {
                      const code = (c.courseCode || '').trim().toUpperCase();
                      if (!code) return;
                      if (!courseMap[code]) {
                        courseMap[code] = {
                          courseCode: code,
                          courseName: (c.courseName || '').trim(),
                          ltpSet: new Set(),
                          batches: new Set(),
                          isElective: Boolean(c.isElective)
                        };
                      }
                      if (c.isElective) {
                        courseMap[code].isElective = true;
                      }
                      if (c.courseName && (!courseMap[code].courseName || courseMap[code].courseName.length < c.courseName.trim().length)) {
                        courseMap[code].courseName = c.courseName.trim();
                      }
                      if (c.ltp) {
                        const ltp = c.ltp.trim().toUpperCase();
                        if (ltp === 'L') courseMap[code].ltpSet.add('Lecture');
                        else if (ltp === 'T') courseMap[code].ltpSet.add('Tutorial');
                        else if (ltp === 'P') courseMap[code].ltpSet.add('Lab');
                        else courseMap[code].ltpSet.add(c.ltp);
                      }
                      if (c.batchTaught && c.batchTaught.toUpperCase() !== 'ALL') {
                        c.batchTaught.split(',').forEach(b => {
                          const tb = b.trim().toUpperCase();
                          if (tb && tb !== 'ALL') courseMap[code].batches.add(tb);
                        });
                      }
                    });

                    const formatTitle = (str) => {
                      if (!str) return '';
                      const t = str.trim();
                      if (/[a-z]/.test(t) && /[A-Z]/.test(t)) return t;
                      return t.toLowerCase().split(' ').map(w => {
                        if (['and', 'or', 'of', 'in', 'for', 'to', '&'].includes(w)) return w;
                        if (['ii', 'iii', 'iv', 'v', 'vi'].includes(w)) return w.toUpperCase();
                        return w.charAt(0).toUpperCase() + w.slice(1);
                      }).join(' ');
                    };

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

                    const uniqueCourses = Object.values(courseMap);
                    if (uniqueCourses.length === 0) return null;
                    
                    return (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {uniqueCourses.map((c, idx) => {
                          const ltpStr = formatLtps(c.ltpSet);
                          const batchStr = formatBatches(c.batches);
                          const courseTitle = formatTitle(c.courseName);
                          return (
                            <span 
                              key={idx} 
                              className="badge badge-neutral" 
                              style={{ 
                                fontSize: '11px', 
                                padding: '4px 9px', 
                                background: 'var(--bg-card-hover)', 
                                border: '1px solid var(--border-light)', 
                                color: 'var(--text-primary)', 
                                lineHeight: '1.4',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={c.courseName ? `${c.courseCode}: ${c.courseName}` : c.courseCode}
                            >
                              <span style={{ fontWeight: 700 }}>{c.courseCode}</span>
                              {courseTitle && courseTitle.toUpperCase() !== c.courseCode && (
                                <span style={{ color: 'var(--text-secondary)' }}>· {courseTitle}</span>
                              )}
                              <span style={{ color: 'var(--text-muted)' }}>· {ltpStr}</span>
                              {c.isElective && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: isFreeElective(c.courseCode) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  color: isFreeElective(c.courseCode) ? '#10b981' : '#3b82f6',
                                  border: `1px solid ${isFreeElective(c.courseCode) ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`
                                }}>
                                  {isFreeElective(c.courseCode) ? 'Free Elective' : 'Elective [EL-1]'}
                                </span>
                              )}
                              {batchStr && (
                                <span style={{ opacity: 0.8, color: 'var(--text-muted)' }}>
                                  ({batchStr})
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <ThaparProfileLink teacher={selectedTeacher} />
                    {selectedTeacher.linkedIn && (
                      <a
                        href={selectedTeacher.linkedIn.startsWith('http') ? selectedTeacher.linkedIn : `https://${selectedTeacher.linkedIn}`}
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

                  {/* ACTION BUTTONS (Moved here to sit below profile info) */}
                  <div className="profile-action-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                    <button
                      onClick={() => {
                        const publicUrl = `${window.location.origin}/teacher/${encodeURIComponent(selectedTeacher.id || selectedTeacher.userId)}`;
                        try {
                          navigator.clipboard.writeText(publicUrl);
                          toast.success('Public profile link copied to clipboard!', {
                            description: 'Share it with your batchmates or use the quick channels.'
                          });
                        } catch (e) {
                          // Handled by modal copy
                        }
                        openShareTeacher(selectedTeacher);
                      }}
                      className="btn btn-secondary"
                      title="Share profile to batch WhatsApp groups, Reddit, or copy link"
                    >
                      <Share2 size={16} />
                      <span>Share Profile</span>
                    </button>
                    <button
                      onClick={() => openSuggestTeacher(selectedTeacher)}
                      className="btn btn-secondary"
                      title="Add missing courses or info to this faculty member"
                    >
                      <Edit3 size={16} />
                      <span>Add Info / Course</span>
                    </button>
                    {eligibleTeachers.some(t => (t.id || t.userId) === (selectedTeacher.id || selectedTeacher.userId)) ? (
                      <button
                        onClick={() => openWriteReview(selectedTeacher)}
                        className="btn btn-primary"
                      >
                        <MessageSquarePlus size={16} />
                        <span>Write Feedback Review</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="btn btn-secondary"
                        title="You can only write reviews for teachers who taught your batch/section."
                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      >
                        <MessageSquarePlus size={16} />
                        <span>Not Eligible to Review</span>
                      </button>
                    )}
                    <button 
                      onClick={openAIInsights}
                      style={{ 
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        padding: '9px 18px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, #4a0000 100%)',
                        color: 'white', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 18px rgba(128, 0, 0, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <BorderBeam size={80} duration={6} borderWidth={1.5} colorFrom="#ffffff" colorTo="var(--primary)" />
                      <Sparkles size={18} style={{ position: 'relative', zIndex: 1, color: '#ffffff' }} />
                      <span style={{ position: 'relative', zIndex: 1 }}>Generate Faculty Insights</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* RATING DISTRIBUTION (Right Side) */}
              <div className="rating-dist-card" style={{ 
                flexShrink: 0, 
                width: '100%', 
                maxWidth: '280px', 
                background: 'var(--bg-card-subtle)', 
                padding: '16px', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-light)' 
              }}>
                <h4 style={{ fontSize: '11px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rating Distribution
                </h4>
                {(() => {
                  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  let total = selectedTeacherReviews.length;
                  selectedTeacherReviews.forEach(r => {
                    if (r.rating >= 1 && r.rating <= 5) dist[Math.round(r.rating)]++;
                  });
                  if (total === 0) total = 1; // avoid divide by zero
                  
                  return [5, 4, 3, 2, 1].map(star => {
                    const count = dist[star];
                    const percent = (count / total) * 100;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, width: '10px', color: 'var(--text-secondary)' }}>{star}</span>
                        <Star size={11} color="var(--star-gold)" fill="var(--star-gold)" />
                        <div style={{ flex: 1, height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--star-gold)', width: `${percent}%`, borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  });
                })()}
                {selectedTeacherReviews.length > 0 && selectedTeacherReviews.length < (selectedTeacherRatings?.totalReviews || 0) && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                    Based on recent {selectedTeacherReviews.length} reviews
                  </div>
                )}
              </div>

              {/* COMMUNITY TAGS (Fills empty space) */}
              <div className="community-tags-card" style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                background: 'var(--bg-card)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                minWidth: '300px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Community Tags
                  </h4>
                  {selectedTeacherTags && selectedTeacherTags.sufficientData && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      Based on {selectedTeacherTags.totalReviewsWithTags} reviews
                    </span>
                  )}
                </div>

                {reviewsLoading || !selectedTeacherTags ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--border-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span>Loading tag statistics...</span>
                  </div>
                ) : !selectedTeacherTags.sufficientData ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>
                    {selectedTeacherTags.needed > 0
                      ? `${selectedTeacherTags.needed} more review${selectedTeacherTags.needed > 1 ? 's' : ''} needed to unlock tag insights.`
                      : 'No student tags submitted for this teacher yet.'}
                  </div>
                ) : displayTeacherTagStats.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>
                    No community tags recorded for this faculty member yet.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: Math.max(210, displayTeacherTagStats.length * 40) }}>
                    <Suspense fallback={null}>
                      <TagStatsChart data={displayTeacherTagStats} />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>

            {/* Ratings Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
              <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} />
                  <span>Overall Time-Weighted Rating</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--star-gold)' }}>
                    <NumberTicker value={selectedTeacherRatings?.overallRating || 0} decimalPlaces={2} />
                  </span>
                  <StarRating rating={selectedTeacherRatings?.overallRating || 0} size={18} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Long-term pedagogical decay</span>
              </div>

              <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <TrendingUp size={13} />
                  <span>Current Rating (Last 180 Days)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb' }}>
                    <NumberTicker value={selectedTeacherRatings?.recentRating || 0} decimalPlaces={2} />
                  </span>
                  <StarRating rating={selectedTeacherRatings?.recentRating || 0} size={18} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recent semester evaluation</span>
              </div>

              <div className="card" style={{ background: 'var(--bg-card-subtle)', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Student Reviews
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                  <NumberTicker value={selectedTeacherReviews.length} decimalPlaces={0} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified student evaluations</span>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              Transparent Student Reviews ({selectedTeacherReviews.length})
            </h3>
            {selectedTeacherReviews.length > 0 && (
              <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                {['recent', 'helpful'].map(mode => (
                  <button 
                    key={mode} 
                    onClick={() => setReviewSort(mode)} 
                    style={{ 
                      padding: '8px 20px', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      border: 'none', 
                      cursor: 'pointer', 
                      transition: 'all 0.15s', 
                      background: reviewSort === mode ? 'var(--primary)' : 'transparent', 
                      color: reviewSort === mode ? '#fff' : 'var(--text-secondary)' 
                    }}
                  >
                    {mode === 'recent' ? 'Most Recent' : 'Highest Liked'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading reviews...
            </div>
          ) : selectedTeacherReviews.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
                No reviews posted for this teacher yet. Be the first student who was taught by this faculty member to share your experience!
              </p>
              {eligibleTeachers.some(t => (t.id || t.userId) === (selectedTeacher.id || selectedTeacher.userId)) ? (
                <button
                  onClick={() => openWriteReview(selectedTeacher)}
                  className="btn btn-primary btn-sm"
                >
                  Write First Review
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-secondary btn-sm"
                  title="You can only write reviews for teachers who taught your batch/section."
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                >
                  Not Eligible to Review
                </button>
              )}
            </div>
          ) : (
            <>
              {sortedReviews.map((rev) => (
                <ReviewCard
                  key={rev.reviewId}
                  review={rev}
                  onUpdate={handleReviewSubmitted}
                />
              ))}
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
      ) : (
        /* Teacher Catalog Grid */
        <div>
          {/* Live Campus Tags Marquee Ribbon */}
          <div style={{ marginBottom: '22px', padding: '10px 0', border: '1px solid var(--border-light)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <Marquee pauseOnHover={true} duration={26}>
              {Object.values(TAG_THEMES).map(theme => (
                <span 
                  key={theme.name} 
                  style={{ 
                    margin: '0 16px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: theme.color, 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    background: theme.bg, 
                    border: `1px solid ${theme.borderSubtle}`,
                    boxShadow: `0 0 8px ${theme.borderSubtle}`
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.border }} />
                  #{theme.name}
                </span>
              ))}
            </Marquee>
          </div>

          {/* CR Portal Banner if student is CR and there are unverified faculty */}
          {isStudentCR && unverifiedBatchFaculty.length > 0 && (
            <div className="card" style={{
              marginBottom: '20px',
              padding: '18px 22px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.03) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)'
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: '#fef3c7', color: '#b45309',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Crown size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Batch {studentBatch} Class Representative Portal
                  </h3>
                  <span className="badge badge-warning" style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                    CR Role Active
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 12px 0' }}>
                  You have {unverifiedBatchFaculty.length} faculty teaching batch {studentBatch} who currently only have timetable initials/codes. Verify their full names below so your batchmates can review them!
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {unverifiedBatchFaculty.map(t => (
                    <button
                      key={t.id || t.userId}
                      type="button"
                      onClick={() => openSuggestTeacher(t)}
                      className="btn btn-sm"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Identify: <strong>{t.fullName}</strong></span>
                      <span style={{ color: '#d97706', fontSize: '11px' }}>→ Fill</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs and Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <AnimatedTabs
              activeTab={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'eligible',
                  label: `Teachers Who Taught You (${eligibleTeachers.length})`,
                  icon: BookOpen
                },
                {
                  id: 'all',
                  label: `All Campus Faculty (${allTeachers.length})`,
                  icon: Users
                }
              ]}
            />

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter teachers by name or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', paddingRight: '40px', fontSize: '13px', width: '100%' }}
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                  <kbd style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    cursor: 'pointer'
                  }}
                  title="Global Quick Search"
                  onClick={() => setIsCmdMenuOpen(true)}>
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <CloudLoader />
              <p style={{ marginTop: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Loading faculty directory...
              </p>
            </div>
          ) : displayedTeachers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>
                {tab === 'eligible'
                  ? `No faculty registered yet for batch ${studentBatch} (${studentBranch})`
                  : 'No faculty members match your search.'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                As teachers register and enter the courses/batches they teach, they will automatically appear here for you to review.
              </p>
            </div>
          ) : (
            <div className="grid-3">
              {displayedTeachers.slice(0, visibleTeacherCount).map((teacher, idx) => {
                const id = teacher.userId || teacher.user?.id || teacher.id;
                const ratings = teacherRatingsMap[id] || { overallRating: 0, recentRating: 0, totalReviews: 0 };
                return (
                  <TeacherCard
                    key={id || idx}
                    teacher={teacher}
                    ratings={ratings}
                    onViewReviews={handleViewReviews}
                    onWriteReview={(t) => openWriteReview(t)}
                    onSuggestName={(t) => openSuggestTeacher(t)}
                    isCR={isStudentCR}
                    canReview={tab === 'eligible'}
                  />
                );
              })}
            </div>
          )}
          {hasMoreTeachers && displayedTeachers.length > 0 && (
            <div ref={loadMoreTeachersRef} style={{ height: '1px' }} aria-hidden="true" />
          )}
        </div>
      )}

      
      {isAIInsightsOpen && selectedTeacher && (
        <TeacherAIInsights 
          teacherId={selectedTeacher.userId || selectedTeacher.id || selectedTeacher.user?.id}
          teacherName={selectedTeacher.fullName || selectedTeacher.name}
          onClose={() => setIsAIInsightsOpen(false)}
        />
      )}

      {/* Review Submission Modal */}
      {reviewingTeacher && (
        <WriteReviewModal
          teacher={reviewingTeacher}
          onClose={() => setReviewingTeacher(null)}
          onSuccess={handleReviewSubmitted}
        />
      )}

      {/* Global Command Menu & Spotlight Search */}
      <CommandMenu
        isOpen={isCmdMenuOpen}
        onClose={() => setIsCmdMenuOpen(false)}
        teachers={allTeachers}
        onSelectTeacher={(t) => {
          handleViewReviews(t);
        }}
      />

      {/* Change Batch & Section Modal */}
      {isChangeBatchOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              Request Batch / Section Change
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              If your tutorial or lab subgroup was reshuffled, or your branch changed, submit a request here. An admin will review it and update your batch.
            </p>

            <form onSubmit={handleUpdateBatchSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Batch Group / Subgroup *</label>
                <input
                  type="text"
                  list="change-batch-list"
                  className="form-input"
                  placeholder="e.g. 3Q12, 3C11, 2C11, 1A11"
                  value={newBatchInput}
                  onChange={(e) => setNewBatchInput(e.target.value.toUpperCase().trim())}
                  required
                />
                <datalist id="change-batch-list">
                  <option value="3Q11" />
                  <option value="3Q12" />
                  <option value="3Q13" />
                  <option value="3C11" />
                  <option value="3C12" />
                  <option value="2Q11" />
                  <option value="2C11" />
                  <option value="1A11" />
                  <option value="1B11" />
                  <option value="4C11" />
                  <option value="4Q11" />
                </datalist>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Enter your official tutorial/lab sub-group (e.g. 3Q11, 3C11, 2C11, 1A11, 4C11).
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Engineering Branch *</label>
                <select
                  className="form-select"
                  value={newBranchInput}
                  onChange={(e) => setNewBranchInput(e.target.value)}
                  required
                >
                  <optgroup label="💻 Computer / AI">
                    <option value="COE">Computer Engineering (COE)</option>
                    <option value="COPC">Computer Science & Engineering – Patiala (COPC)</option>
                    <option value="COSE">Computer Science & Engineering – Dera Bassi (COSE)</option>
                    <option value="COBS">Computer Science & Business Systems (COBS)</option>
                    <option value="DSAI">Artificial Intelligence & Data Science (DSAI)</option>
                    <option value="AIML">Artificial Intelligence & Machine Learning (AIML)</option>
                    <option value="RAI">Robotics & Artificial Intelligence (RAI)</option>
                    <option value="ENC">Electronics & Computer Engineering (ENC)</option>
                    <option value="EEC">Electrical & Computer Engineering (EEC)</option>
                  </optgroup>
                  <optgroup label="⚡ Electronics / Electrical">
                    <option value="ECE">Electronics & Communication Engineering (ECE)</option>
                    <option value="EVD">Electronics Engineering – VLSI Design & Technology (EVD)</option>
                    <option value="ELE">Electrical Engineering (ELE)</option>
                    <option value="EIC">Electronics (Instrumentation & Control) Engineering (EIC)</option>
                  </optgroup>
                  <optgroup label="⚙️ Core Engineering">
                    <option value="ME">Mechanical Engineering</option>
                    <option value="MEC">Mechatronics Engineering</option>
                    <option value="CE">Civil Engineering</option>
                    <option value="CHE">Chemical Engineering</option>
                  </optgroup>
                  <optgroup label="🧬 Bio / Other">
                    <option value="BT">Biotechnology</option>
                    <option value="BME">Biomedical Engineering</option>
                  </optgroup>
                </select>
              </div>

              {batchUpdateMsg && (
                <div style={{ marginBottom: '14px', fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                  {batchUpdateMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={updatingBatch}
                  onClick={() => setIsChangeBatchOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBatch}
                  className="btn btn-primary btn-sm"
                >
                  {updatingBatch ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Elective Course Modal */}
      {isElectiveModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setIsElectiveModalOpen(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                  Select Your Semester Electives
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsElectiveModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Select the electives you are enrolled in according to your Thapar Webkiosk portal. Faculty teaching your chosen electives (along with your core batch faculty) will appear in your review list. You can set either to <strong>None</strong>.
            </p>

            {/* Discipline Elective [EL-1] */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                Discipline Elective [EL-1]
              </label>
              <select
                className="form-select"
                value={modalDisciplineElective}
                onChange={(e) => setModalDisciplineElective(e.target.value)}
              >
                <option value="">None / Not Allocated (Core Only)</option>
                {OFFICIAL_ELECTIVES.disciplineElectives.map(el => (
                  <option key={el.code} value={el.code}>
                    {el.code} - {el.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Free Elective */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                Free Elective (Open Elective)
              </label>
              <select
                className="form-select"
                value={modalFreeElective}
                onChange={(e) => setModalFreeElective(e.target.value)}
              >
                <option value="">None / Not Allocated (Core Only)</option>
                {OFFICIAL_ELECTIVES.freeElectives.map(el => (
                  <option key={el.code} value={el.code}>
                    {el.code} - {el.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={savingElective}
                onClick={() => setIsElectiveModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingElective}
                onClick={handleSaveElective}
                className="btn btn-primary btn-sm"
              >
                {savingElective ? 'Saving...' : 'Save Electives'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Teacher Name Modal */}
      {suggestTeacher && (
        <SuggestTeacherModal
          teacher={suggestTeacher}
          isOpen={Boolean(suggestTeacher)}
          onClose={() => setSuggestTeacher(null)}
          isCR={isStudentCR}
          studentBatch={studentBatch}
          onSuccess={(msg) => {
            setSuggestionToast(msg);
            setTimeout(() => setSuggestionToast(null), 6000);
          }}
        />
      )}

      {/* Share Professor Profile Modal */}
      {sharingTeacher && (
        <ShareProfileModal
          teacher={sharingTeacher}
          isOpen={Boolean(sharingTeacher)}
          onClose={() => setSharingTeacher(null)}
        />
      )}

      {/* Suggestion Toast Notification */}
      {suggestionToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Sparkles size={18} />
          <span>{suggestionToast}</span>
          <button
            onClick={() => setSuggestionToast(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px', fontSize: '18px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <MobileNav activeTab={mobileTab} setActiveTab={handleTabChange} />
    </div>
  );
};
