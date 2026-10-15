import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Book, Activity, FileText, Scale, Users } from 'lucide-react';
import { api } from '../api/client';
import RadialOrbitalTimeline from './ui/radial-orbital-timeline';

export const TeacherAIInsights = ({ teacherId, teacherName, onClose }) => {
  const [loading, setLoading] = useState(true);
  // 'ok' | 'no_reviews' | 'unavailable'
  const [status, setStatus] = useState(null);
  const [insights, setInsights] = useState({});

  useEffect(() => {
    const fetchAISummary = async () => {
      try {
        setLoading(true);
        const data = await api.getTeacherAISummary(teacherId);

        if (data?.status === 'ok' && data.summary) {
          setInsights(data.summary);
          setStatus('ok');
        } else if (data?.status === 'no_reviews') {
          setStatus('no_reviews');
        } else {
          setStatus('unavailable');
        }
      } catch (err) {
        console.error("Failed to load AI Insights", err);
        setStatus('unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchAISummary();
  }, [teacherId]);

  if (!loading && status !== 'ok') {
    const noReviews = status === 'no_reviews';
    return createPortal(
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{noReviews ? 'No reviews yet' : 'Summary unavailable'}</h2>
            <button className="btn btn-subtle" onClick={onClose} style={{ padding: '8px' }}><X size={20} /></button>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {noReviews
              ? `There are no student reviews for ${teacherName} to summarize yet.`
              : `An AI summary for ${teacherName} can't be generated right now. Read the student reviews directly, or try again in a few minutes.`}
          </p>
        </div>
      </div>
    , document.body);
  }

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '1000px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h2 className="modal-title" style={{ color: 'var(--primary)', marginBottom: '4px' }}>AI Insights: {teacherName}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Synthesized from student reviews</p>
          </div>
          <button className="btn btn-subtle" onClick={onClose} style={{ padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Analyzing Data...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Synthesizing student reviews for {teacherName}</p>
          </div>
        ) : (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: '#030712', zIndex: 9999 }}>
            {/* Header Overlay */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1000, background: 'linear-gradient(to bottom, rgba(3,7,18,0.8) 0%, transparent 100%)' }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
                  <span style={{ color: '#c084fc' }}>✨ AI Synthesis:</span> {teacherName}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Click any orbiting node to inspect AI-summarized insights across 5 core evaluation metrics.</p>
              </div>
              <button 
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
              >
                <X size={18} />
              </button>
            </div>

            <RadialOrbitalTimeline 
              timelineData={[
                { id: 'workload', title: 'Course Workload', icon: Book, glowColor: '#6366f1', category: 'Metric', date: 'AI summary', content: insights.workload || "No data." },
                { id: 'overall', title: 'Overall Vibe', icon: Activity, glowColor: '#10b981', category: 'Metric', date: 'AI summary', content: insights.overall || "No data." },
                { id: 'teaching', title: 'Teaching Quality', icon: FileText, glowColor: '#ec4899', category: 'Metric', date: 'AI summary', content: insights.teaching || "No data." },
                { id: 'grading', title: 'Grading & Fairness', icon: Scale, glowColor: '#0ea5e9', category: 'Metric', date: 'AI summary', content: insights.grading || "No data." },
                { id: 'approachability', title: 'Approachability', icon: Users, glowColor: '#f59e0b', category: 'Metric', date: 'AI summary', content: insights.approachability || "No data." }
              ]} 
            />
          </div>
        )}
      </div>
    </div>
  , document.body);
};

