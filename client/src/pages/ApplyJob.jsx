import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await api.get(`/jobs/invite/${jobId}`);
        setJob(data);
      } catch (err) {
        toast.error('Job not found or invalid invite link');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (jobId) fetchJob();
  }, [jobId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !file) return toast.error('Please fill all fields');
    
    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('resume', file);

    try {
      const { data } = await api.post(`/jobs/apply/${jobId}`, formData);
      
      // Save shadow user token
      localStorage.setItem('token', data.token);
      
      // Start the interview with the parsed resume
      navigate('/interview', { 
        state: { 
          resume_id: data.resume_id, 
          application_id: data.application_id, 
          interview_type: 'technical'
        } 
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading job details...</div>;

  return (
    <div className="page" style={{ maxWidth: 500, margin: '40px auto' }}>
      <div className="card animate-fade-up">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 5 }}>
          Apply for <span className="gradient-text">{job?.title}</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, color: '#94a3b8', fontSize: '0.85rem', marginBottom: 25, fontWeight: 500 }}>
          <span className="badge badge-purple">{job?.work_mode}</span>
          <span>{job?.tech_stack}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="form-label">Upload Resume <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(PDF/TXT)</span></label>
            <input 
              type="file" 
              accept=".pdf,.txt,.docx"
              onChange={(e) => setFile(e.target.files[0])}
              className="form-input"
              style={{ padding: '8px' }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: 10, padding: '14px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center' }} 
            disabled={submitting}
          >
            {submitting ? <div className="spinner" style={{ width: 18, height: 18 }} /> : 'Apply & Start Interview →'}
          </button>
        </form>
      </div>
    </div>
  );
}
