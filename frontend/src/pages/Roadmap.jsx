import React from 'react';
import { Tag, ListFilter, Sparkles, ArrowLeft, CheckCircle2, Clock, CircleDashed } from "lucide-react";

const timelineData = [
  {
    id: 1,
    title: "Tags + Bar Chart",
    date: "This Week",
    content: "Predefined student tags on reviews, aggregated into a percentage bar chart on each teacher's profile once they cross a 5-review threshold.",
    icon: Tag,
    status: "in-progress",
    energy: 60,
  },
  {
    id: 2,
    title: "Curated Highlights",
    date: "Phase 2",
    content: "Top-5 most-helpful reviews shown by default, 'would take again %' headline stat, and a 'Based on N reviews' trust label next to the chart.",
    icon: ListFilter,
    status: "pending",
    energy: 20,
  },
  {
    id: 3,
    title: "AI + Trend Insights",
    date: "Phase 3",
    content: "Semester-over-semester rating trend, AI-generated one-line summaries, a 'similar teachers' recommender, and a teacher right-to-reply feature.",
    icon: Sparkles,
    status: "pending",
    energy: 5,
  },
];

export function Roadmap({ onBack }) {
  return (
    <div style={{ flex: 1, width: '100%', minHeight: '80vh' }}>
      <div style={{ maxWidth: '800px', margin: '20px auto 0', padding: '0 20px' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} />
          <span>Back to Homepage</span>
        </button>
      </div>

      <main className="main-content" style={{ maxWidth: '800px', padding: '20px 20px 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="brand-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Product Roadmap</h1>
          <span className="brand-subtitle" style={{ fontSize: '13px' }}>Upcoming Features & Improvements</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {timelineData.map((item) => {
            const Icon = item.icon;
            const StatusIcon = item.status === 'completed' ? CheckCircle2 : item.status === 'in-progress' ? Clock : CircleDashed;
            const statusColor = item.status === 'completed' ? 'var(--badge-verified-text)' : item.status === 'in-progress' ? 'var(--primary)' : 'var(--text-muted)';
            
            return (
              <div key={item.id} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ 
                  backgroundColor: 'var(--bg-main)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)'
                }}>
                  <Icon size={28} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{item.title}</h3>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontSize: '13px', fontWeight: 600, padding: '4px 10px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)' }}>
                      <StatusIcon size={14} />
                      <span style={{ textTransform: 'capitalize' }}>{item.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                    {item.content}
                  </p>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      <span>Implementation Progress</span>
                      <span>{item.energy}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <div style={{ height: '100%', width: `${item.energy}%`, backgroundColor: 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default Roadmap;

