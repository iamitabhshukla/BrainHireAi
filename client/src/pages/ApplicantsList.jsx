import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ApplicantsList() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const { data } = await api.get(`/jobs/${jobId}/applicants`);
        setApplicants(data);
      } catch (err) {
        toast.error('Failed to load applicants');
      } finally {
        setLoading(false);
      }
    };
    if (jobId) loadApplicants();
  }, [jobId]);

  const updateStatus = async (applicationId, newStatus) => {
    try {
      await api.patch(`/jobs/applications/${applicationId}/status`, { status: newStatus });
      setApplicants(applicants.map(app => 
        app.application_id === applicationId ? { ...app, status: newStatus } : app
      ));
      toast.success(`Applicant marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'shortlisted': return 'badge-green';
      case 'rejected': return 'badge-red';
      case 'completed': return 'badge-purple';
      default: return 'badge'; // pending
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading applicants...</div>;

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 30 }}>
        <button onClick={() => navigate('/recruiter')} className="btn btn-ghost btn-sm" style={{ marginBottom: 15 }}>
          ← Back to Dashboard
        </button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#4ade80' }}>👥</span> Applicants
        </h1>
        <p style={{ color: '#94a3b8' }}>{applicants.length} candidate{applicants.length !== 1 && 's'} — sorted by AI score</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {applicants.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#64748b' }}>No applicants found for this job yet.</p>
          </div>
        ) : (
          applicants.map((app, index) => (
            <div key={app.application_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderLeft: app.status === 'shortlisted' ? '4px solid #4ade80' : app.status === 'rejected' ? '4px solid #ef4444' : 'none' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#94a3b8' }}>
                  {index + 1}
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>{app.name}</h3>
                    <span className={`badge ${getStatusColor(app.status)}`} style={{ fontSize: '0.7rem' }}>{app.status.toUpperCase()}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{app.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: app.ai_score >= 75 ? '#4ade80' : app.ai_score >= 50 ? '#fbbf24' : '#ef4444' }}>
                    {app.ai_score || 0}<span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>/100</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>AI Score</div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {app.status !== 'shortlisted' && (
                    <button onClick={() => updateStatus(app.application_id, 'shortlisted')} className="btn btn-ghost btn-sm" style={{ color: '#4ade80' }}>
                      Shortlist
                    </button>
                  )}
                  {app.status !== 'rejected' && (
                    <button onClick={() => updateStatus(app.application_id, 'rejected')} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
                      Reject
                    </button>
                  )}
                  <button 
                    onClick={() => navigate(`/analytics/${app.interview_id}`)}
                    disabled={!app.interview_id}
                    className="btn btn-primary btn-sm" 
                    style={{ padding: '6px 14px' }}
                  >
                    Details →
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
