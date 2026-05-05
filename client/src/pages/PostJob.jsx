import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tech_stack: '',
    experience_level: '',
    work_mode: 'remote',
    max_applicants: 20,
    invite_only: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return toast.error('Title and description are required');
    
    setLoading(true);
    try {
      await api.post('/jobs', formData);
      toast.success('Job posted successfully!');
      navigate('/recruiter');
    } catch (err) {
      toast.error('Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <button onClick={() => navigate('/recruiter')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
        ← Back
      </button>

      <div className="card">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4ade80' }}>💼</span> Post New Job
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label className="form-label">Job Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" className="form-input" placeholder="e.g. Senior Frontend Engineer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Tech Stack <span style={{ color: '#64748b' }}>(comma separated)</span></label>
              <input type="text" className="form-input" placeholder="React, Node.js, PostgreSQL" value={formData.tech_stack} onChange={e => setFormData({...formData, tech_stack: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="form-label">Job Description <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea className="form-input" rows="5" placeholder="Describe the role, responsibilities, and requirements..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label className="form-label">Work Mode</label>
              <select className="form-input" value={formData.work_mode} onChange={e => setFormData({...formData, work_mode: e.target.value})}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div>
              <label className="form-label">Experience Level</label>
              <input type="text" className="form-input" placeholder="e.g. 3-5 years" value={formData.experience_level} onChange={e => setFormData({...formData, experience_level: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="form-label">Max Applicants <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="number" className="form-input" value={formData.max_applicants} onChange={e => setFormData({...formData, max_applicants: parseInt(e.target.value)})} required min="1" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
            <input type="checkbox" id="inviteOnly" checked={formData.invite_only} onChange={e => setFormData({...formData, invite_only: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
            <div>
              <label htmlFor="inviteOnly" style={{ color: '#f1f5f9', fontWeight: 600, display: 'block' }}>Invite-Only (Unlisted)</label>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hidden from public job board. Only accessible via a shareable invite link.</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 10, padding: '12px', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
