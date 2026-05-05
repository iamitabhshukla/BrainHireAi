import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data } = await api.get('/jobs');
        setJobs(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const copyInvite = (id) => {
    const link = `${window.location.origin}/invite/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading jobs...</div>;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9' }}>Recruiter Dashboard</h1>
          <p style={{ color: '#94a3b8' }}>Manage job postings and review AI-screened candidates.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/post-job')}>+ Post Job</button>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 15 }}>Your Job Postings</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {jobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#64748b' }}>No jobs posted yet. Create your first job posting to get started!</p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>{job.title}</h3>
                  <span className="badge badge-green">OPEN</span>
                  {job.invite_only && <span className="badge badge-purple">Invite-Only</span>}
                </div>
                <div style={{ display: 'flex', gap: 15, color: '#94a3b8', fontSize: '0.85rem', marginBottom: 12 }}>
                  <span>📍 {job.work_mode}</span>
                  <span>👥 Max: {job.max_applicants}</span>
                  <span>📄 Applicants: {job.applicants_count || 0}</span>
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 6, fontSize: '0.8rem', fontFamily: 'monospace', color: '#a78bfa' }}>
                    🔗 {window.location.origin}/invite/{job.id}
                  </div>
                  <button onClick={() => copyInvite(job.id)} className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>
                    Copy
                  </button>
                </div>
              </div>

              <button className="btn btn-ghost" onClick={() => navigate(`/jobs/${job.id}/applicants`)}>
                View Applicants →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
