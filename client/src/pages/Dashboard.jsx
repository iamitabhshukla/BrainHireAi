import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Brain, Upload, Play, BarChart3, CheckCircle, Clock,
  TrendingUp, Zap, Award, Target, ChevronRight
} from 'lucide-react';

const StatCard = ({ icon, label, value, color, suffix = '' }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
      {value !== null && value !== undefined ? value : '—'}{suffix}
    </div>
  </div>
);

const InterviewTypeCard = ({ type, icon, label, desc, color, gradient, onClick }) => (
  <div onClick={onClick} className="card" style={{
    cursor: 'pointer', background: gradient,
    border: `1px solid ${color}44`, position: 'relative', overflow: 'hidden',
    transition: 'all 0.3s', userSelect: 'none',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 60px ${color}33`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.07, fontSize: '5rem', pointerEvents: 'none' }}>{icon}</div>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 14 }}>
      {icon}
    </div>
    <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9', marginBottom: 6 }}>{label}</h3>
    <p style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 16 }}>{desc}</p>
    <button className="btn btn-sm" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', gap: 6 }}>
      Start <ChevronRight size={14} />
    </button>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setStats(res.data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const startInterview = async (type) => {
    try {
      const resumeRes = await api.get('/resume');
      navigate('/interview', { state: { resume_id: resumeRes.data.id, interview_type: type } });
    } catch {
      navigate('/upload');
    }
  };

  return (
    <div className="page">
      {/* Welcome */}
      <div style={{ marginBottom: 36 }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>
            <Brain size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>Ready to ace your next interview?</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon={<Play size={16} />} label="Total Sessions" value={stats?.total_sessions ?? 0} color="#a78bfa" />
        <StatCard icon={<CheckCircle size={16} />} label="Completed" value={stats?.completed_sessions ?? 0} color="#4ade80" />
        <StatCard icon={<Award size={16} />} label="Avg Score" value={stats?.avg_scores?.avg_overall ?? '—'} suffix={stats?.avg_scores?.avg_overall ? '%' : ''} color="#facc15" />
        <StatCard icon={<TrendingUp size={16} />} label="Avg Technical" value={stats?.avg_scores?.avg_technical ?? '—'} suffix={stats?.avg_scores?.avg_technical ? '%' : ''} color="#60a5fa" />
      </div>

      {/* Interview Types */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-title">Start an Interview</h2>
        <p className="section-subtitle">Choose your interview type to begin a personalized AI-powered session</p>
        <div className="grid-3">
          <InterviewTypeCard
            type="technical" icon={<Zap size={22} />} color="#a78bfa"
            gradient="linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.06) 100%)"
            label="Technical Interview"
            desc="Deep-dive into coding, algorithms, system design, and your specific tech stack from your resume."
            onClick={() => startInterview('technical')}
          />
          <InterviewTypeCard
            type="hr" icon={<Target size={22} />} color="#4ade80"
            gradient="linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(16,185,129,0.04) 100%)"
            label="HR / Behavioural"
            desc="Practice communication, situational questions, leadership stories, and soft-skill scenarios."
            onClick={() => startInterview('hr')}
          />
          <InterviewTypeCard
            type="mixed" icon={<Brain size={22} />} color="#60a5fa"
            gradient="linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(99,102,241,0.04) 100%)"
            label="Mixed Interview"
            desc="The complete package — combines technical depth with behavioural assessment for a realistic final-round experience."
            onClick={() => startInterview('mixed')}
          />
        </div>
      </div>

      {/* Bottom — Resume Upload CTA + Recent Sessions */}
      <div className="grid-2">
        {/* Upload CTA */}
        <div className="card card-accent" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Upload size={20} color="#a78bfa" />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>Your Resume</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Upload or update your resume PDF. BrainHire will extract your skills and craft questions tailored just for you.
            </p>
          </div>
          {stats?.skills?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {stats.skills.slice(0, 8).map((s, i) => (
                <span key={i} className="badge badge-purple">{s}</span>
              ))}
              {stats.skills.length > 8 && <span className="badge badge-purple">+{stats.skills.length - 8} more</span>}
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')} style={{ alignSelf: 'flex-start' }}>
            <Upload size={15} /> {stats?.skills?.length > 0 ? 'Update Resume' : 'Upload Resume'}
          </button>
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={18} color="#64748b" />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1rem' }}>Recent Sessions</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Loading...</div>
          ) : stats?.recent_sessions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recent_sessions.map((s) => (
                <div key={s.id} onClick={() => navigate(`/analytics/${s.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div>
                    <span className={`badge ${s.interview_type === 'technical' ? 'badge-purple' : s.interview_type === 'hr' ? 'badge-green' : 'badge-blue'}`} style={{ marginBottom: 4, display: 'inline-flex' }}>
                      {s.interview_type}
                    </span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      {new Date(s.started_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.overall_score != null
                      ? <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.overall_score >= 70 ? '#4ade80' : s.overall_score >= 50 ? '#facc15' : '#f87171' }}>{s.overall_score}%</span>
                      : <span className="badge badge-yellow">In Progress</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: '0.875rem' }}>
              No sessions yet. Start your first interview above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
