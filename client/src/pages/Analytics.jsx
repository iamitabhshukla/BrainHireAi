import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Award, TrendingUp, MessageSquare, BarChart3, ArrowLeft, Repeat, CheckCircle2, XCircle, AlertCircle, BookOpen } from 'lucide-react';

const ScoreCircle = ({ score, size = 120, label, color }) => {
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: size > 100 ? '1.5rem' : '1rem', fontWeight: 800, fill: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500, textAlign: 'center' }}>{label}</span>
    </div>
  );
};

const getGrade = (score) => {
  if (score >= 90) return { grade: 'A+', color: '#4ade80', label: 'Exceptional' };
  if (score >= 80) return { grade: 'A', color: '#4ade80', label: 'Excellent' };
  if (score >= 70) return { grade: 'B', color: '#60a5fa', label: 'Good' };
  if (score >= 60) return { grade: 'C', color: '#facc15', label: 'Average' };
  return { grade: 'D', color: '#f87171', label: 'Needs Work' };
};

export default function Analytics() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        // Show last session — fetch all sessions and pick latest completed
        try {
          const res = await api.get('/interview/sessions');
          const completed = res.data.find(s => s.status === 'completed');
          if (completed) navigate(`/analytics/${completed.id}`, { replace: true });
          else { setLoading(false); }
        } catch { setLoading(false); }
        return;
      }
      try {
        const res = await api.get(`/interview/sessions/${sessionId}`);
        setData(res.data);
      } catch (err) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
      <p style={{ color: '#64748b' }}>Loading your results...</p>
    </div>
  );

  if (!data || !data.analytics) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <BarChart3 size={48} color="#64748b" style={{ marginBottom: 16 }} />
      <h2 style={{ color: '#f1f5f9', marginBottom: 8 }}>No Analytics Found</h2>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.875rem' }}>Complete an interview session to see your results here.</p>
      <button className="btn btn-primary" onClick={() => navigate('/upload')}><Repeat size={15} /> Start Interview</button>
    </div>
  );

  const { session, qa, analytics } = data;
  const feedback = analytics.feedback_json || {};
  const grade = getGrade(analytics.overall_score);

  const radarData = [
    { subject: 'Technical', A: analytics.technical_score },
    { subject: 'Communication', A: analytics.communication_score },
    { subject: 'Overall', A: analytics.overall_score },
  ];

  const qaScores = feedback.question_feedback?.map((qf, i) => ({
    name: `Q${i + 1}`,
    score: qf.score * 10,
    question: qf.question?.substring(0, 40) + '...',
  })) || [];

  const TABS = ['overview', 'questions', 'feedback'];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 12, gap: 6 }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9' }}>
            Interview <span className="gradient-text">Results</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
            {session?.interview_type?.toUpperCase()} · {session?.filename} ·{' '}
            {session?.ended_at ? new Date(session.ended_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
          <Repeat size={15} /> Retry Interview
        </button>
      </div>

      {/* Grade Banner */}
      <div className="card" style={{
        background: `linear-gradient(135deg, ${grade.color}11 0%, rgba(99,102,241,0.06) 100%)`,
        border: `1px solid ${grade.color}33`, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: grade.color, lineHeight: 1, textShadow: `0 0 30px ${grade.color}88` }}>
            {grade.grade}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{grade.label}</div>
        </div>

        <div style={{ display: 'flex', gap: 32, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ScoreCircle score={analytics.overall_score} label="Overall Score" color="#a78bfa" />
          <ScoreCircle score={analytics.technical_score} label="Technical" color="#60a5fa" size={100} />
          <ScoreCircle score={analytics.communication_score} label="Communication" color="#4ade80" size={100} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', textTransform: 'capitalize', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
            background: tab === t ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'transparent',
            color: tab === t ? '#fff' : '#64748b',
          }}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="animate-fade-up">
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Radar Chart */}
            <div className="card">
              <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: '0.95rem' }}>
                <BarChart3 size={16} style={{ display: 'inline', marginRight: 8, color: '#a78bfa' }} />
                Performance Radar
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Strengths & Improvements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', flex: 1 }}>
                <h3 style={{ fontWeight: 700, color: '#4ade80', marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} /> Strengths
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(feedback.strengths || []).map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#94a3b8', fontSize: '0.875rem' }}>
                      <span style={{ color: '#4ade80', marginTop: 2 }}>✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)', flex: 1 }}>
                <h3 style={{ fontWeight: 700, color: '#fb923c', marginBottom: 12, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} /> Areas to Improve
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(feedback.improvements || []).map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#94a3b8', fontSize: '0.875rem' }}>
                      <span style={{ color: '#fb923c', marginTop: 2 }}>→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Overall Feedback */}
          {feedback.overall_feedback && (
            <div className="card" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MessageSquare size={16} color="#a78bfa" />
                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>AI Evaluator's Summary</span>
              </div>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem' }}>{feedback.overall_feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* QUESTIONS TAB */}
      {tab === 'questions' && (
        <div className="animate-fade-up">
          {/* Bar Chart */}
          {qaScores.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16, fontSize: '0.95rem' }}>Score per Question</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={qaScores} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #4f46e5', borderRadius: 8, color: '#f1f5f9' }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {qaScores.map((entry, i) => (
                      <Cell key={i} fill={entry.score >= 70 ? '#4ade80' : entry.score >= 50 ? '#facc15' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Q&A List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {qa.map((item, i) => {
              const qfb = feedback.question_feedback?.find(q => q.question === item.question || q.question?.startsWith(item.question?.substring(0, 30)));
              return (
                <div key={item.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span className="badge badge-purple">Q{i + 1}</span>
                    {qfb && <span style={{ fontSize: '1.1rem', fontWeight: 800, color: qfb.score >= 7 ? '#4ade80' : qfb.score >= 5 ? '#facc15' : '#f87171' }}>{qfb.score}/10</span>}
                  </div>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 10, fontSize: '0.9rem', lineHeight: 1.6 }}>{item.question}</p>
                  <div style={{ borderLeft: '3px solid rgba(139,92,246,0.4)', paddingLeft: 14, marginBottom: qfb ? 10 : 0 }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7 }}>
                      {item.answer || <em style={{ color: '#64748b' }}>No answer provided</em>}
                    </p>
                  </div>
                  {qfb?.feedback && (
                    <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                      <p style={{ color: '#a78bfa', fontSize: '0.82rem', lineHeight: 1.6 }}>💡 {qfb.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FEEDBACK TAB */}
      {tab === 'feedback' && (
        <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {feedback.overall_feedback && (
            <div className="card">
              <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#facc15" /> Performance Summary
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem' }}>{feedback.overall_feedback}</p>
            </div>
          )}
          {feedback.recommended_resources?.length > 0 && (
            <div className="card" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <h3 style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} /> Recommended Study Areas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feedback.recommended_resources.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(96,165,250,0.08)', padding: '10px 14px', borderRadius: 8 }}>
                    <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.8rem', minWidth: 24 }}>{i + 1}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/upload')}>
              <Repeat size={16} /> Retake Interview
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <TrendingUp size={15} /> Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
