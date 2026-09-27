import { getTagTheme } from '../lib/tagTheme';
import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Flag, Send, User, Mail, Award, Tag } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const ReviewCard = ({ review, onUpdate }) => {
  const { user } = useAuth();
  const isOwnReview = Boolean(
    user && (user.id === review.reviewerId || user.email === review.reviewerEmail)
  );
  const [replies, setReplies] = useState(review.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const initialUserVote = review.votes?.find((v) => v.userId === user?.id)?.voteType || null;
  const [upvotes, setUpvotes] = useState(review.upvotes || 0);
  const [downvotes, setDownvotes] = useState(review.downvotes || 0);
  const [hasVoted, setHasVoted] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [replyVoteState, setReplyVoteState] = useState({});
  const [isVotingReply, setIsVotingReply] = useState({});
  const [flagged, setFlagged] = useState(review.isFlagged || false);

  React.useEffect(() => {
    if (review.replies) setReplies(review.replies);
    if (typeof review.upvotes === 'number') setUpvotes(review.upvotes);
    if (typeof review.downvotes === 'number') setDownvotes(review.downvotes);
  }, [review.replies, review.upvotes, review.downvotes]);

  const handleVote = async (type) => {
    if (!user || user.role !== 'STUDENT' || isVoting) return;

    setIsVoting(true);
    
    // --- Optimistic UI Update ---
    const currentVote = hasVoted;
    const isUnvoting = currentVote === type;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;
    
    setHasVoted(isUnvoting ? null : type);
    if (isUnvoting) {
      if (type === 'UP') setUpvotes((prev) => Math.max(0, prev - 1));
      else setDownvotes((prev) => Math.max(0, prev - 1));
    } else {
      if (type === 'UP') {
        setUpvotes((prev) => prev + 1);
        if (currentVote === 'DOWN') setDownvotes((prev) => Math.max(0, prev - 1));
      } else {
        setDownvotes((prev) => prev + 1);
        if (currentVote === 'UP') setUpvotes((prev) => Math.max(0, prev - 1));
      }
    }

    try {
      const res = await api.voteReview(review.reviewId, type, user.id);
      
      // Sync with authoritative server numbers if provided
      if (typeof res.upvotes === 'number' && typeof res.downvotes === 'number') {
        setUpvotes(res.upvotes);
        setDownvotes(res.downvotes);
      }
    } catch (err) {
      console.error("Vote failed:", err);
      // Revert optimistic changes on failure
      setHasVoted(currentVote);
      setUpvotes(previousUpvotes);
      setDownvotes(previousDownvotes);
      toast.error("Failed to register vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteReply = async (replyId, type) => {
    if (!user || user.role !== 'STUDENT' || isVotingReply[replyId]) return;

    setIsVotingReply((prev) => ({ ...prev, [replyId]: true }));
    
    // --- Optimistic UI Update ---
    const currentVote = replyVoteState[replyId];
    const isUnvoting = currentVote === type;
    
    const replyIndex = replies.findIndex(r => r.replyId === replyId);
    if (replyIndex === -1) {
      setIsVotingReply((prev) => ({ ...prev, [replyId]: false }));
      return;
    }
    const previousReplyState = { ...replies[replyIndex] };
    
    setReplyVoteState((prev) => ({ ...prev, [replyId]: isUnvoting ? null : type }));
    setReplies((prev) =>
      prev.map((r) => {
        if (r.replyId === replyId) {
          if (isUnvoting) {
            const newUp = type === 'UP' ? Math.max(0, (r.upvotes || 0) - 1) : (r.upvotes || 0);
            const newDown = type === 'DOWN' ? Math.max(0, (r.downvotes || 0) - 1) : (r.downvotes || 0);
            return { ...r, upvotes: newUp, downvotes: newDown };
          } else {
            const newUp = type === 'UP' ? (r.upvotes || 0) + 1 : (currentVote === 'UP' ? Math.max(0, (r.upvotes || 0) - 1) : (r.upvotes || 0));
            const newDown = type === 'DOWN' ? (r.downvotes || 0) + 1 : (currentVote === 'DOWN' ? Math.max(0, (r.downvotes || 0) - 1) : (r.downvotes || 0));
            return { ...r, upvotes: newUp, downvotes: newDown };
          }
        }
        return r;
      })
    );

    try {
      const res = await api.voteReply(replyId, type, user.id);
      
      // Sync with authoritative server numbers if provided
      setReplies((prev) =>
        prev.map((r) => {
          if (r.replyId === replyId && typeof res.upvotes === 'number' && typeof res.downvotes === 'number') {
            return { ...r, upvotes: res.upvotes, downvotes: res.downvotes };
          }
          return r;
        })
      );
    } catch (err) {
      console.error("Failed to vote on reply:", err);
      // Revert optimistic changes on failure
      setReplyVoteState((prev) => ({ ...prev, [replyId]: currentVote }));
      setReplies((prev) => prev.map((r) => r.replyId === replyId ? previousReplyState : r));
      toast.error("Failed to register vote");
    } finally {
      setIsVotingReply((prev) => ({ ...prev, [replyId]: false }));
    }
  };

  const handleFlag = async () => {
    if (!user || flagged) return;
    const reason = window.prompt("Please state the reason for reporting this review (e.g. offensive, spam):");
    if (!reason) return;
    try {
      await api.flagReview(review.reviewId, reason, user.id);
      setFlagged(true);
      toast.success("Review has been reported to administrators for moderation.");
    } catch (err) {
      console.error("Flag failed:", err);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    setIsSubmittingReply(true);
    try {
      let authorName = "Student";
      let authorBadge = "Student";
      let authorRole = user.role;

      if (user.role === 'TEACHER') {
        authorName = user.teacherProfile?.fullName ? `${user.teacherProfile.fullName}` : 'Faculty Member';
        authorBadge = `${user.teacherProfile?.designation || 'Faculty'} (${user.teacherProfile?.department || 'Department'})`;
        authorRole = "TEACHER";
      } else if (user.role === 'ADMIN') {
        authorName = 'Administrator';
        authorBadge = 'Admin';
        authorRole = "ADMIN";
      } else {
        authorName = 'Anonymous Student';
        authorBadge = 'Verified Student';
        authorRole = "STUDENT";
      }

      await api.addReply(review.reviewId, {
        authorId: user.id,
        authorRole: user.role,
        authorName: authorName,
        authorBadge: authorBadge,
        replyText: newReply,
        parentReplyId: replyingTo?.id || null
      });
      setNewReply('');
      setReplyingTo(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || "Failed to post reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const buildReplyTree = (flatReplies) => {
    const map = {};
    const roots = [];
    flatReplies.forEach(r => {
      map[r.replyId] = { ...r, children: [] };
    });
    flatReplies.forEach(r => {
      if (r.parentReplyId && map[r.parentReplyId]) {
        map[r.parentReplyId].children.push(map[r.replyId]);
      } else {
        roots.push(map[r.replyId]);
      }
    });

    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      nodes.forEach(n => sortNodes(n.children));
      return nodes;
    };

    return sortNodes(roots);
  };

  const renderReply = (reply, depth = 0) => {
    const isTeacherReply = reply.authorRole === 'TEACHER';
    const isAdminReply = reply.authorRole === 'ADMIN';
    const maxDepth = 4;
    const paddingLeft = depth > 0 ? (depth > maxDepth ? 12 : 24) : 0;
    const isPrivilegedReply = isTeacherReply || isAdminReply;
    const displayAuthorName = isPrivilegedReply ? reply.authorName : 'Anonymous Student';
    const displayAuthorBadge = isPrivilegedReply ? reply.authorBadge : 'Verified Student';

    return (
      <div key={reply.replyId} style={{ paddingLeft: `${paddingLeft}px`, marginTop: depth > 0 ? '8px' : '0' }}>
        <div
          className={`reply-item ${isTeacherReply ? 'reply-teacher-bg' : isAdminReply ? 'reply-admin-bg' : ''}`}
          style={{ position: 'relative' }}
        >
          {depth > 0 && (
            <div style={{
              position: 'absolute',
              left: '-12px',
              top: '20px',
              width: '12px',
              height: '1px',
              backgroundColor: 'var(--border-light)'
            }} />
          )}
          {depth > 0 && (
            <div style={{
              position: 'absolute',
              left: '-12px',
              top: '-8px',
              width: '1px',
              height: '28px',
              backgroundColor: 'var(--border-light)'
            }} />
          )}

          <div className="reply-meta">
            <span style={isTeacherReply ? { fontWeight: 700, color: 'var(--primary)' } : isAdminReply ? { fontWeight: 700, color: 'var(--text-primary)' } : { fontWeight: 600 }}>
              {displayAuthorName}
            </span>
            {displayAuthorBadge && (
              <span
                className={`badge ${isTeacherReply ? 'badge-teacher' : 'badge-student'}`}
                style={isAdminReply ? { backgroundColor: '#2d3748', color: '#fff', fontSize: '11px', padding: '2px 8px' } : { fontSize: '11px', padding: '2px 8px' }}
              >
                {isTeacherReply ? <Award size={11} /> : isAdminReply ? <User size={11} /> : null}
                {displayAuthorBadge}
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
              {formatDate(reply.createdAt)}
            </span>
          </div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '13.5px', lineHeight: 1.5 }}>
            {reply.replyText}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            {user && (
              <button
                type="button"
                onClick={() => setReplyingTo({ id: reply.replyId, name: displayAuthorName })}
                className="btn btn-subtle btn-sm"
                style={{ padding: '2px 8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}
              >
                <MessageSquare size={11} />
                <span>Reply</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleVoteReply(reply.replyId, 'UP')}
              disabled={isVotingReply[reply.replyId] || user?.role !== 'STUDENT'}
              className="btn btn-subtle btn-sm"
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                color: replyVoteState[reply.replyId] === 'UP' ? 'var(--badge-verified-text)' : 'var(--text-secondary)',
                fontWeight: replyVoteState[reply.replyId] === 'UP' ? 700 : 500,
                opacity: user?.role !== 'STUDENT' ? 0.6 : 1,
                cursor: user?.role !== 'STUDENT' ? 'not-allowed' : isVotingReply[reply.replyId] ? 'default' : 'pointer'
              }}
              title={user?.role !== 'STUDENT' ? 'Only students can vote' : replyVoteState[reply.replyId] === 'UP' ? 'Click again to remove your upvote' : 'Upvote reply'}
            >
              <ArrowBigUp size={14} fill={replyVoteState[reply.replyId] === 'UP' ? 'currentColor' : 'none'} strokeWidth={replyVoteState[reply.replyId] === 'UP' ? 0 : 1.5} />
              <span>{reply.upvotes || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => handleVoteReply(reply.replyId, 'DOWN')}
              disabled={isVotingReply[reply.replyId] || user?.role !== 'STUDENT'}
              className="btn btn-subtle btn-sm"
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                color: replyVoteState[reply.replyId] === 'DOWN' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: replyVoteState[reply.replyId] === 'DOWN' ? 700 : 500,
                opacity: user?.role !== 'STUDENT' ? 0.6 : 1,
                cursor: user?.role !== 'STUDENT' ? 'not-allowed' : isVotingReply[reply.replyId] ? 'default' : 'pointer'
              }}
              title={user?.role !== 'STUDENT' ? 'Only students can vote' : replyVoteState[reply.replyId] === 'DOWN' ? 'Click again to remove your downvote' : 'Downvote reply'}
            >
              <ArrowBigDown size={14} fill={replyVoteState[reply.replyId] === 'DOWN' ? 'currentColor' : 'none'} strokeWidth={replyVoteState[reply.replyId] === 'DOWN' ? 0 : 1.5} />
              <span>{reply.downvotes || 0}</span>
            </button>
          </div>
        </div>

        {reply.children && reply.children.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '0',
              bottom: '0',
              width: '1px',
              backgroundColor: 'var(--border-light)'
            }} />
            {reply.children.map(child => renderReply(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatDate = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      {/* Header with Student Name, Roll No & Email */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Student Name & Roll Number */}
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-primary' : 'badge-verified'}`} style={{ fontSize: '13px', fontWeight: 700 }}>
              <User size={13} />
              {user?.role === 'ADMIN' ? (
                review.reviewerName && review.reviewerName !== 'Anonymous Student'
                  ? `${review.reviewerName} ${review.reviewerRollNo ? `(${review.reviewerRollNo})` : ''}`
                  : (review.reviewerRollNo ? `Student (${review.reviewerRollNo})` : (review.reviewerEmail || 'Verified Student'))
              ) : review.reviewerName === 'Anonymous Student' 
                ? 'Anonymous Student' 
                : `${review.reviewerName || 'Student'} (${review.reviewerRollNo || 'Verified'})`
              }
            </span>

            {/* Student Email */}
            {review.reviewerEmail && (
              <span className="badge badge-neutral" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Mail size={12} />
                {review.reviewerEmail}
              </span>
            )}

            {/* Batch */}
            {review.reviewerBatch && (
              <span className="badge badge-student">
                Batch {review.reviewerBatch}
              </span>
            )}

            {/* Branch */}
            {review.reviewerBranch && (
              <span className="badge badge-neutral">
                {review.reviewerBranch}
              </span>
            )}

            {/* Course Code & Name */}
            {review.courseCode && (
              <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                {review.courseCode} {review.courseName ? `• ${review.courseName}` : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Reviewed on {formatDate(review.createdAt)}
          </div>
        </div>

        {/* Rating Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StarRating rating={review.rating} size={18} />
          <span style={{ fontWeight: 800, fontSize: '15px' }}>{review.rating}.0</span>
        </div>
      </div>

      {review.tags && review.tags.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          marginBottom: '16px',
          paddingTop: '4px'
        }}>
          {review.tags.filter(t => t !== "None of these fit").map((tag, idx) => {
            const theme = getTagTheme(tag);
            return (
              <span key={idx} style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px', 
                fontWeight: 600, 
                padding: '4px 12px', 
                borderRadius: '20px', 
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                color: theme.color,
                boxShadow: theme.glow,
                letterSpacing: '0.01em'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.color, boxShadow: theme.glow, marginRight: '2px' }} />
                #{tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Review Text */}
      <p style={{ fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
        {review.reviewText}
      </p>

      {/* Action Bar (Upvote, Downvote, Replies, Flag) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Reddit Style Vote Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card-subtle)',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => handleVote('UP')}
              disabled={isVoting || isOwnReview || user?.role !== 'STUDENT'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 8px',
                background: 'transparent', border: 'none',
                cursor: (isOwnReview || user?.role !== 'STUDENT') ? 'not-allowed' : isVoting ? 'default' : 'pointer',
                color: hasVoted === 'UP' ? '#ef4444' : 'var(--text-secondary)',
                opacity: (isOwnReview || user?.role !== 'STUDENT') ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              title={user?.role !== 'STUDENT' ? 'Only students can vote' : isOwnReview ? 'You cannot vote on your own review' : hasVoted === 'UP' ? 'Click again to remove your upvote' : 'Upvote'}
            >
              <ArrowBigUp size={18} fill={hasVoted === 'UP' ? '#ef4444' : 'none'} strokeWidth={hasVoted === 'UP' ? 0 : 1.5} />
            </button>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              minWidth: '22px',
              textAlign: 'center',
              color: hasVoted === 'UP' ? '#ef4444' : hasVoted === 'DOWN' ? '#3b82f6' : 'var(--text-primary)'
            }}>
              {upvotes - downvotes}
            </span>
            <button
              type="button"
              onClick={() => handleVote('DOWN')}
              disabled={isVoting || isOwnReview || user?.role !== 'STUDENT'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px 8px',
                background: 'transparent', border: 'none',
                cursor: (isOwnReview || user?.role !== 'STUDENT') ? 'not-allowed' : isVoting ? 'default' : 'pointer',
                color: hasVoted === 'DOWN' ? '#3b82f6' : 'var(--text-secondary)',
                opacity: (isOwnReview || user?.role !== 'STUDENT') ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              title={user?.role !== 'STUDENT' ? 'Only students can vote' : isOwnReview ? 'You cannot vote on your own review' : hasVoted === 'DOWN' ? 'Click again to remove your downvote' : 'Downvote'}
            >
              <ArrowBigDown size={18} fill={hasVoted === 'DOWN' ? '#3b82f6' : 'none'} strokeWidth={hasVoted === 'DOWN' ? 0 : 1.5} />
            </button>
          </div>

          <button
            onClick={() => setShowReplies(!showReplies)}
            className="btn btn-subtle btn-sm"
            style={{ 
              borderRadius: '20px', 
              background: 'var(--bg-card-subtle)', 
              padding: '6px 14px',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MessageSquare size={14} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{replies.length}</span>
          </button>
        </div>

        {user?.role === 'STUDENT' && (
          <button
            onClick={handleFlag}
            disabled={flagged}
            className="btn btn-subtle btn-sm"
            style={{ 
              borderRadius: '20px', 
              background: 'transparent', 
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: flagged ? 'var(--text-muted)' : 'var(--text-secondary)'
            }}
            title="Report review for moderation"
          >
            <Flag size={14} />
            <span style={{ fontSize: '13px' }}>{flagged ? 'Reported' : 'Report'}</span>
          </button>
        )}
      </div>

      {/* Threaded Discussion & Replies */}
      {showReplies && (
        <div className="review-replies-container">
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Transparent Discussion & Faculty Feedback ({replies.length})
          </h4>

          {replies.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
              No replies yet. Use this discussion thread to ask for constructive suggestions, share counter-opinions, or clarify questions.
            </p>
          ) : (
            buildReplyTree(replies).map(rootReply => renderReply(rootReply, 0))
          )}

          {/* Add Reply Form (Students and Teachers) */}
          {user ? (
            <div style={{ marginTop: '16px' }}>
              {replyingTo && (
                <div style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Replying to <strong>{replyingTo.name}</strong></span>
                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }} onClick={() => setReplyingTo(null)}>Cancel</button>
                </div>
              )}
              <form onSubmit={handleAddReply} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    replyingTo
                      ? `Write your reply to ${replyingTo.name}...`
                      : user.role === 'TEACHER'
                      ? "Reply to student (e.g. ask how you can improve lectures)..."
                      : user.role === 'ADMIN'
                      ? "Post an official administrator reply..."
                      : "Share your perspective or counter-opinion..."
                  }
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingReply || !newReply.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: user.role === 'TEACHER' || user.role === 'ADMIN' ? '140px' : '80px' }}
                >
                  <Send size={13} />
                  <span>{user.role === 'TEACHER' ? 'Reply as Faculty' : user.role === 'ADMIN' ? 'Reply as Admin' : 'Reply'}</span>
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
