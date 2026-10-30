import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/client';
import { toast } from 'sonner';
import {
  ArrowBigUp, MessageSquare, Send, User, HelpCircle, BookOpen, Compass, Lightbulb, Coffee,
  EyeOff, Home, CircleDashed, Flame, Clock, TrendingUp, ChevronDown, Plus, X
} from 'lucide-react';

// Posts are stored as "[Topic] Title\n\nBody" in the existing content field, so no database change
// is needed. Older posts without a topic or a body still render (their first line becomes the title).
const TOPICS = [
  { id: 'Doubt', label: 'Doubt', icon: HelpCircle, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', title: 'e.g. How does normalization work in DBMS?', body: 'Add details: course code, what you already tried, where you got stuck.' },
  { id: 'Exams', label: 'Exams', icon: BookOpen, color: '#b45309', bg: 'rgba(217, 119, 6, 0.14)', title: 'e.g. Important topics for the UCS503 EST?', body: 'Which exam, what you have covered so far, what you are unsure about.' },
  { id: 'Courses', label: 'Courses & electives', icon: Compass, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', title: 'e.g. Is the Cloud Computing elective worth it?', body: 'What are you deciding between? What matters to you (workload, grading, interest)?' },
  { id: 'Advice', label: 'Advice', icon: Lightbulb, color: '#059669', bg: 'rgba(5, 150, 105, 0.12)', title: 'e.g. Balancing labs, projects and internship prep?', body: 'Give some context so seniors can give useful advice.' },
  { id: 'Vent', label: 'Just venting', icon: Coffee, color: '#db2777', bg: 'rgba(219, 39, 119, 0.12)', title: "What's on your mind?", body: "It's okay to not be okay. Batchmates are here to listen." }
];
const TOPIC_PREFIX = /^\[(Doubt|Exams|Courses|Advice|Vent)\]\s*/;
const MAX_POST_LENGTH = 2000;
const MAX_TITLE_LENGTH = 150;
const UPVOTED_KEY = 'rateprof_support_upvoted';

const RULES = [
  { title: 'Be kind', text: 'Everyone here is a student too. Disagree with ideas, not people.' },
  { title: 'No personal attacks', text: 'Do not name and shame faculty or students. Use faculty reviews for course feedback.' },
  { title: 'Keep exams fair', text: 'No sharing of papers or answers while an exam is running.' },
  { title: 'Stay on campus topics', text: 'Academics, courses, campus life and support. No spam or self-promotion.' },
  { title: 'Anonymous is anonymous', text: 'Anonymous posts hide your name from other students. Do not try to unmask anyone.' }
];

const parsePost = (content = '') => {
  const match = content.match(TOPIC_PREFIX);
  const topic = match ? TOPICS.find(t => t.id === match[1]) : null;
  const rest = match ? content.replace(TOPIC_PREFIX, '') : content;
  const breakAt = rest.indexOf('\n');
  const title = (breakAt === -1 ? rest : rest.slice(0, breakAt)).trim();
  const body = breakAt === -1 ? '' : rest.slice(breakAt + 1).trim();
  return { topic, title, body };
};

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Reddit-style "hot": votes and replies count, but newer posts float up
const hotScore = (p) => {
  const hours = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
  return (p.upvotes + 2 * (p.comments?.length || 0) + 1) / Math.pow(hours + 2, 1.5);
};

const readUpvoted = () => {
  try { return new Set(JSON.parse(localStorage.getItem(UPVOTED_KEY) || '[]')); } catch { return new Set(); }
};

const authorInfo = (item) => {
  if (item.isAnonymous || !item.author) {
    return { handle: item.isMine ? 'you (anonymous)' : 'anonymous', initials: null, meta: null };
  }
  const p = item.author.studentProfile || item.author.teacherProfile;
  const name = p?.fullName || 'student';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const meta = item.author.teacherProfile ? 'Faculty' : p?.batch || null;
  return { handle: item.isMine ? `${name} (you)` : name, initials, meta };
};

const Avatar = ({ item, size = 24 }) => {
  const { initials } = authorInfo(item);
  return (
    <span className="rd-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} data-anon={!initials}>
      {initials || <User size={Math.round(size * 0.6)} />}
    </span>
  );
};

const Flair = ({ topic }) => {
  if (!topic) return null;
  return <span className="rd-flair" style={{ color: topic.color, background: topic.bg }}>{topic.label}</span>;
};

export const PeerSupportFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topicId, setTopicId] = useState('Doubt');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('hot');
  const [upvoted, setUpvoted] = useState(readUpvoted);
  const [openPostId, setOpenPostId] = useState(null);
  const [expandedBodies, setExpandedBodies] = useState(() => new Set());
  const [commentInputs, setCommentInputs] = useState({});
  const [replyAnonymous, setReplyAnonymous] = useState(true);
  const [openRule, setOpenRule] = useState(null);
  const titleRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (composerOpen) titleRef.current?.focus();
  }, [composerOpen]);

  const fetchPosts = async () => {
    try {
      const data = await api.getSupportPosts();
      setPosts(data.posts || []);
    } catch (error) {
      toast.error('Could not load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const activeTopic = TOPICS.find(t => t.id === topicId);

  const openComposer = (withTopic) => {
    if (withTopic) setTopicId(withTopic);
    setComposerOpen(true);
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setTitle('');
    setBody('');
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const content = `[${topicId}] ${t}${body.trim() ? `\n\n${body.trim()}` : ''}`;
    if (content.length > MAX_POST_LENGTH) {
      toast.error(`Posts can be at most ${MAX_POST_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.createSupportPost({ content, isAnonymous });
      closeComposer();
      setSort('new');
      setFilter('All');
      fetchPosts();
      toast.success(topicId === 'Doubt' ? 'Doubt posted. Batchmates can answer now.' : 'Posted.');
    } catch (error) {
      toast.error(error.message || 'Could not post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (e, postId) => {
    e.stopPropagation();
    if (upvoted.has(postId)) return;
    const next = new Set(upvoted).add(postId);
    setUpvoted(next);
    try { localStorage.setItem(UPVOTED_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p));
    try {
      await api.upvoteSupportPost(postId);
    } catch (error) {
      fetchPosts();
      toast.error('Could not upvote');
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentContent = commentInputs[postId];
    if (!commentContent || !commentContent.trim()) return;

    try {
      await api.addSupportComment(postId, { content: commentContent.trim(), isAnonymous: replyAnonymous });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      fetchPosts();
      toast.success('Comment posted');
    } catch (error) {
      toast.error(error.message || 'Could not post your comment');
    }
  };

  const counts = useMemo(() => {
    const c = { All: posts.length, Unanswered: 0 };
    for (const p of posts) {
      if (!p.comments?.length) c.Unanswered += 1;
      const id = parsePost(p.content).topic?.id;
      if (id) c[id] = (c[id] || 0) + 1;
    }
    return c;
  }, [posts]);

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (filter === 'Unanswered') list = list.filter(p => !p.comments?.length);
    else if (filter !== 'All') list = list.filter(p => parsePost(p.content).topic?.id === filter);
    const sorted = [...list];
    if (sort === 'new') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'top') sorted.sort((a, b) => b.upvotes - a.upvotes || new Date(b.createdAt) - new Date(a.createdAt));
    else sorted.sort((a, b) => hotScore(b) - hotScore(a));
    return sorted;
  }, [posts, filter, sort]);

  const myActivity = posts.filter(p => p.isMine).length
    + posts.reduce((n, p) => n + (p.comments || []).filter(c => c.isMine).length, 0);

  const feeds = [
    { id: 'All', label: 'All posts', icon: Home },
    { id: 'Unanswered', label: 'Unanswered', icon: CircleDashed }
  ];
  const filterLabel = (f) => feeds.find(x => x.id === f)?.label || TOPICS.find(t => t.id === f)?.label || f;
  const sorts = [
    { id: 'hot', label: 'Hot', icon: Flame },
    { id: 'new', label: 'New', icon: Clock },
    { id: 'top', label: 'Top', icon: TrendingUp }
  ];

  return (
    <div className="rd-layout">
      {/* Left: feeds and topics */}
      <aside className="rd-side rd-side-left" aria-label="Browse">
        <nav className="rd-nav">
          {feeds.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.id} type="button" className={`rd-nav-item${filter === f.id ? ' is-active' : ''}`} onClick={() => setFilter(f.id)}>
                <Icon size={18} />
                <span className="rd-nav-label">{f.label}</span>
                <span className="rd-nav-count">{counts[f.id] || 0}</span>
              </button>
            );
          })}
        </nav>
        <div className="rd-nav-heading">Topics</div>
        <nav className="rd-nav">
          {TOPICS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" className={`rd-nav-item${filter === t.id ? ' is-active' : ''}`} onClick={() => setFilter(t.id)}>
                <span className="rd-nav-dot" style={{ color: t.color, background: t.bg }}><Icon size={13} /></span>
                <span className="rd-nav-label">{t.label}</span>
                <span className="rd-nav-count">{counts[t.id] || 0}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main feed */}
      <div className="rd-main">
        {/* Create post */}
        <div ref={composerRef}>
          {!composerOpen ? (
            <button type="button" className="rd-create" onClick={() => openComposer()}>
              <span className="rd-avatar" data-anon="true" style={{ width: 34, height: 34 }}><User size={18} /></span>
              <span className="rd-create-input">Ask a doubt or start a discussion…</span>
              <span className="rd-create-plus" aria-hidden="true"><Plus size={18} /></span>
            </button>
          ) : (
            <form className="rd-composer" onSubmit={handleCreatePost}>
              <div className="rd-composer-head">
                <span>Create a post</span>
                <button type="button" className="rd-icon-btn" onClick={closeComposer} aria-label="Close"><X size={18} /></button>
              </div>

              <div className="rd-flair-picker" role="radiogroup" aria-label="Topic">
                {TOPICS.map(t => {
                  const Icon = t.icon;
                  const selected = t.id === topicId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`rd-flair-option${selected ? ' is-selected' : ''}`}
                      style={selected ? { color: t.color, background: t.bg, borderColor: t.color } : undefined}
                      onClick={() => setTopicId(t.id)}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="rd-title-field">
                <input
                  ref={titleRef}
                  className="form-input rd-title-input"
                  placeholder={activeTopic?.title}
                  value={title}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-label="Title"
                />
                <span className="rd-title-count">{title.length}/{MAX_TITLE_LENGTH}</span>
              </div>
              <textarea
                className="form-textarea rd-body-input"
                placeholder={`${activeTopic?.body} (optional)`}
                value={body}
                maxLength={MAX_POST_LENGTH - MAX_TITLE_LENGTH - 20}
                onChange={(e) => setBody(e.target.value)}
                aria-label="Details"
              />

              <div className="rd-composer-footer">
                <label className="rd-switch">
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                  <span className="rd-switch-track" aria-hidden="true" />
                  <span className="rd-switch-label"><EyeOff size={14} /> {isAnonymous ? 'Post anonymously' : 'Post with your name'}</span>
                </label>
                <div className="rd-composer-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={closeComposer}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !title.trim()}>
                    {submitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sort bar + topic pills (pills only when the left column is hidden) */}
        <div className="rd-toolbar">
          <div className="rd-sorts" role="tablist" aria-label="Sort posts">
            {sorts.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} type="button" role="tab" aria-selected={sort === s.id} className={`rd-sort${sort === s.id ? ' is-active' : ''}`} onClick={() => setSort(s.id)}>
                  <Icon size={16} /> {s.label}
                </button>
              );
            })}
          </div>
          {filter !== 'All' && (
            <button type="button" className="rd-active-filter" onClick={() => setFilter('All')}>
              {filterLabel(filter)} <X size={13} />
            </button>
          )}
        </div>
        <div className="rd-pills" role="tablist" aria-label="Filter posts">
          {['All', 'Unanswered', ...TOPICS.map(t => t.id)].map(f => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={`rd-pill${filter === f ? ' is-active' : ''}`} onClick={() => setFilter(f)}>
              {filterLabel(f)}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="rd-feed">
            {[0, 1, 2].map(i => <div key={i} className="rd-post rd-skeleton" />)}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="rd-empty">
            <MessageSquare size={30} />
            <p className="rd-empty-title">{posts.length === 0 ? 'No posts yet' : 'Nothing here yet'}</p>
            <p className="rd-empty-text">
              {posts.length === 0
                ? 'Be the first to ask. Someone in your batch probably has the same doubt.'
                : filter === 'Unanswered' ? 'Every post has a reply. Nice work, everyone.' : 'No posts with this topic yet.'}
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openComposer(TOPICS.some(t => t.id === filter) ? filter : undefined)}>
              <Plus size={14} /> Create post
            </button>
          </div>
        ) : (
          <div className="rd-feed">
            {visiblePosts.map((post) => {
              const { topic, title: postTitle, body: postBody } = parsePost(post.content);
              const author = authorInfo(post);
              const comments = post.comments || [];
              const isOpen = openPostId === post.id;
              const hasUpvoted = upvoted.has(post.id);
              const longBody = postBody.length > 320 || postBody.split('\n').length > 6;
              const bodyExpanded = expandedBodies.has(post.id) || isOpen;
              const toggleOpen = () => setOpenPostId(isOpen ? null : post.id);
              return (
                <article key={post.id} className={`rd-post${isOpen ? ' is-open' : ''}`}>
                  <div
                    className="rd-post-click"
                    role="button"
                    tabIndex={0}
                    onClick={toggleOpen}
                    onKeyDown={(e) => { if (e.key === 'Enter') toggleOpen(); }}
                    aria-expanded={isOpen}
                  >
                    <div className="rd-post-meta">
                      <Avatar item={post} />
                      <span className="rd-handle">u/{author.handle}</span>
                      {author.meta && <span className="rd-dot">{author.meta}</span>}
                      <span className="rd-dot">{timeAgo(post.createdAt)}</span>
                    </div>
                    <h3 className="rd-post-title">
                      {postTitle}
                      <Flair topic={topic} />
                    </h3>
                    {postBody && (
                      <div className={`rd-post-body${longBody && !bodyExpanded ? ' is-clamped' : ''}`}>{postBody}</div>
                    )}
                    {longBody && !bodyExpanded && (
                      <button
                        type="button"
                        className="rd-read-more"
                        onClick={(e) => { e.stopPropagation(); setExpandedBodies(prev => new Set(prev).add(post.id)); }}
                      >
                        Read more
                      </button>
                    )}
                  </div>

                  <div className="rd-actions">
                    <button
                      type="button"
                      className={`rd-pill-btn rd-vote${hasUpvoted ? ' is-on' : ''}`}
                      onClick={(e) => handleUpvote(e, post.id)}
                      aria-pressed={hasUpvoted}
                      title={hasUpvoted ? 'Upvoted' : 'Upvote'}
                    >
                      <ArrowBigUp size={20} fill={hasUpvoted ? 'currentColor' : 'none'} />
                      <span>{post.upvotes}</span>
                    </button>
                    <button type="button" className={`rd-pill-btn${isOpen ? ' is-active' : ''}`} onClick={toggleOpen} aria-expanded={isOpen}>
                      <MessageSquare size={17} />
                      <span>
                        {comments.length === 0
                          ? (topic?.id === 'Doubt' ? 'Answer' : 'Comment')
                          : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
                      </span>
                    </button>
                    {comments.length === 0 && topic?.id === 'Doubt' && (
                      <span className="rd-unanswered">Unanswered</span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="rd-thread">
                      <form className="rd-comment-box" onSubmit={(e) => handleAddComment(e, post.id)}>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          placeholder={topic?.id === 'Doubt' ? 'Know the answer? Help them out…' : 'Add a comment…'}
                          maxLength={1000}
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          aria-label="Your comment"
                        />
                        <div className="rd-comment-box-footer">
                          <label className="rd-checkbox">
                            <input type="checkbox" checked={replyAnonymous} onChange={(e) => setReplyAnonymous(e.target.checked)} />
                            Comment anonymously
                          </label>
                          <button type="submit" className="btn btn-primary btn-sm" disabled={!commentInputs[post.id]?.trim()}>
                            <Send size={14} /> <span>Comment</span>
                          </button>
                        </div>
                      </form>

                      {comments.length > 0 && (
                        <ul className="rd-comments">
                          {comments.map(comment => {
                            const ca = authorInfo(comment);
                            return (
                              <li key={comment.id} className="rd-comment">
                                <div className="rd-comment-rail">
                                  <Avatar item={comment} size={26} />
                                  <span className="rd-comment-line" aria-hidden="true" />
                                </div>
                                <div className="rd-comment-main">
                                  <div className="rd-post-meta">
                                    <span className="rd-handle">u/{ca.handle}</span>
                                    {ca.meta && <span className="rd-dot">{ca.meta}</span>}
                                    <span className="rd-dot">{timeAgo(comment.createdAt)}</span>
                                  </div>
                                  <p className="rd-comment-text">{comment.content}</p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: about the community and rules */}
      <aside className="rd-side rd-side-right">
        <div className="rd-card rd-about">
          <div className="rd-about-banner" aria-hidden="true" />
          <div className="rd-about-body">
            <div className="rd-about-name">Ask &amp; Discuss</div>
            <p className="rd-about-text">
              Doubts, exams, electives and campus life at TIET. Ask batchmates and seniors, anonymously if you like.
            </p>
            <div className="rd-stats">
              <div><strong>{counts.All}</strong><span>Posts</span></div>
              <div><strong>{counts.Unanswered}</strong><span>Unanswered</span></div>
              <div><strong>{myActivity}</strong><span>Your activity</span></div>
            </div>
            <button type="button" className="btn btn-primary btn-sm rd-about-cta" onClick={() => openComposer()}>
              <Plus size={14} /> Create post
            </button>
            {counts.Unanswered > 0 && (
              <button type="button" className="btn btn-secondary btn-sm rd-about-cta" onClick={() => { setFilter('Unanswered'); setSort('new'); }}>
                Answer {counts.Unanswered === 1 ? 'a question' : `${counts.Unanswered} questions`}
              </button>
            )}
          </div>
        </div>

        <div className="rd-card">
          <div className="rd-card-heading">Community rules</div>
          <ol className="rd-rules">
            {RULES.map((rule, i) => (
              <li key={rule.title}>
                <button type="button" className="rd-rule" onClick={() => setOpenRule(openRule === i ? null : i)} aria-expanded={openRule === i}>
                  <span className="rd-rule-num">{i + 1}</span>
                  <span className="rd-rule-title">{rule.title}</span>
                  <ChevronDown size={16} className={`rd-rule-chevron${openRule === i ? ' is-open' : ''}`} />
                </button>
                {openRule === i && <p className="rd-rule-text">{rule.text}</p>}
              </li>
            ))}
          </ol>
        </div>

        <div className="rd-card">
          <div className="rd-card-heading">Asking a good doubt</div>
          <ul className="rd-tips">
            <li>Put the question in the title.</li>
            <li>Mention the course code, e.g. UCS503.</li>
            <li>Say what you tried and where you got stuck.</li>
            <li>Upvote the answers that helped.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
