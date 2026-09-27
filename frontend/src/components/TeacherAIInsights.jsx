import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Book, Activity, FileText, Scale, Users } from 'lucide-react';
import { api } from '../api/client';
import RadialOrbitalTimeline from './ui/radial-orbital-timeline';

export const TeacherAIInsights = ({ teacherId, teacherName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radarData, setRadarData] = useState([]);
  const [insights, setInsights] = useState({});

  useEffect(() => {
    const fetchAISummary = async () => {
      try {
        setLoading(true);
        const data = await api.getTeacherAISummary(teacherId);
        
        if (!data || !data.summary) {
          throw new Error("Invalid response from AI");
        }

        const summary = data.summary;

        setRadarData([
          { subject: 'Teaching', score: 100 },
          { subject: 'Grading', score: 90 },
          { subject: 'Approachability', score: 85 },
          { subject: 'Workload', score: 70 },
          { subject: 'Overall', score: 95 }
        ]);

        setInsights(summary);
      } catch (err) {
        console.error("Failed to load AI Insights", err);
        setError(err.message || "Failed to generate AI insights.");
      } finally {
        setLoading(false);
      }
    };

    fetchAISummary();
  }, [teacherId]);

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
        ) : error ? (
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--error)' }}>Analysis Failed</h2>
              <button className="btn btn-subtle" onClick={onClose}><X size={20} /></button>
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
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
                { id: 'workload', title: 'Course Workload', icon: Book, glowColor: '#6366f1', category: 'Metric', date: 'AI Generated', content: insights.workload || "No data.", energy: radarData.find(r => r.subject === 'Workload')?.score || 70 },
                { id: 'overall', title: 'Overall Vibe', icon: Activity, glowColor: '#10b981', category: 'Metric', date: 'AI Generated', content: insights.overall || "No data.", energy: radarData.find(r => r.subject === 'Overall')?.score || 95 },
                { id: 'teaching', title: 'Teaching Quality', icon: FileText, glowColor: '#ec4899', category: 'Metric', date: 'AI Generated', content: insights.teaching || "No data.", energy: radarData.find(r => r.subject === 'Teaching')?.score || 100 },
                { id: 'grading', title: 'Grading & Fairness', icon: Scale, glowColor: '#0ea5e9', category: 'Metric', date: 'AI Generated', content: insights.grading || "No data.", energy: radarData.find(r => r.subject === 'Grading')?.score || 90 },
                { id: 'approachability', title: 'Approachability', icon: Users, glowColor: '#f59e0b', category: 'Metric', date: 'AI Generated', content: insights.approachability || "No data.", energy: radarData.find(r => r.subject === 'Approachability')?.score || 85 }
              ]} 
            />
          </div>
        )}
      </div>
    </div>
  , document.body);
};

