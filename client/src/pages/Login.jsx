import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Eye, EyeOff, Sparkles, Zap, Target, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const features = [
  { icon: <Brain size={20} />, title: 'AI-Powered Questions', desc: 'Gemini generates questions from your resume' },
  { icon: <Zap size={20} />, title: 'Voice Interviews', desc: 'Speak to simulate a real interview experience' },
  { icon: <Target size={20} />, title: 'Adaptive Flow', desc: 'Dynamic follow-ups based on your responses' },
  { icon: <TrendingUp size={20} />, title: 'Smart Analytics', desc: 'Get scores and actionable improvement tips' },
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = isRegister
      ? await register(form.name, form.email, form.password)
      : await login(form.email, form.password);

    if (result.success) {
      toast.success(isRegister ? '🎉 Account created! Welcome to BrainHire!' : '✅ Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px 48px 60px 140px',
        background: 'linear-gradient(160deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.06) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        minWidth: 0,
      }}>
        <div style={{ maxWidth: 340, width: '100%' }}>
          {/* Logo — aligned with content */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(139,92,246,0.5)',
              animation: 'glowPulse 3s infinite',
            }}>
              <Brain size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>
                <span className="gradient-text">Brain</span>
                <span style={{ color: '#f1f5f9' }}>Hire</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>AI Interview Coach</p>
            </div>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>Ready for Your Next Interview?</h2>
          <p style={{ color: '#94a3b8', marginBottom: 40, lineHeight: 1.7, fontSize: '0.9rem' }}>
            Practice with AI-powered mock interviews and land your dream job.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a78bfa',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>{f.title}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div style={{
        width: 440, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        background: 'rgba(10,10,26,0.6)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              {isRegister ? 'Join thousands of candidates improving their interviews' : 'Sign in to continue your practice'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text" name="name" placeholder="John Doe"
                  value={form.name} onChange={handleChange} required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email" name="email" placeholder="john@example.com"
                value={form.email} onChange={handleChange} required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPwd ? 'text' : 'password'}
                  name="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  required style={{ paddingRight: 44, width: '100%' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><div className="spinner" /> {isRegister ? 'Creating...' : 'Signing in...'}</> :
                <><Sparkles size={18} /> {isRegister ? 'Create Account' : 'Sign In'}</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <button onClick={() => { setIsRegister(!isRegister); setForm({ name: '', email: '', password: '' }); }}
                style={{ background: 'none', border: 'none', color: '#a78bfa', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                {isRegister ? 'Sign in' : 'Sign up free'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
