import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, LayoutDashboard, Upload, LogOut, BarChart3 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10,10,26,0.85)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(20px)',
      height: '64px', display: 'flex', alignItems: 'center',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139,92,246,0.4)',
          }}>
            <Brain size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span className="gradient-text">Brain</span>
            <span style={{ color: '#e2e8f0' }}>Hire</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { path: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
            { path: '/upload', icon: <Upload size={16} />, label: 'Resume' },
            { path: '/analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
          ].map(({ path, icon, label }) => (
            <Link key={path} to={path} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 500,
              color: isActive(path) ? '#a78bfa' : '#94a3b8',
              background: isActive(path) ? 'rgba(139,92,246,0.12)' : 'transparent',
              transition: 'all 0.2s', textDecoration: 'none',
            }}
              onMouseEnter={e => { if (!isActive(path)) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0'; }}}
              onMouseLeave={e => { if (!isActive(path)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}}
            >
              {icon} {label}
            </Link>
          ))}
        </div>

        {/* User + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Hi, <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{user?.name?.split(' ')[0]}</span>
          </span>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
