import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, Brain, Zap, ArrowRight, X } from 'lucide-react';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, maxSize: 10 * 1024 * 1024,
    onDropRejected: () => toast.error('Please upload a PDF file under 10MB'),
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      toast.success('✅ Resume processed! Skills extracted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 32 }} className="animate-fade-up">
        <h1 className="section-title" style={{ fontSize: '2rem' }}>
          Upload Your <span className="gradient-text">Resume</span>
        </h1>
        <p className="section-subtitle" style={{ fontSize: '0.95rem' }}>
          BrainHire will parse your PDF, extract your skills and experience, then generate tailored interview questions just for you.
        </p>
      </div>

      {/* Drop Zone */}
      <div {...getRootProps()} style={{
        border: `2px dashed ${isDragActive ? '#8b5cf6' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 18, padding: '48px 32px', textAlign: 'center',
        background: isDragActive ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer', transition: 'all 0.3s', marginBottom: 24,
        boxShadow: isDragActive ? '0 0 40px rgba(139,92,246,0.2)' : 'none',
      }}>
        <input {...getInputProps()} />
        {file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={28} color="#4ade80" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1rem' }}>{file.name}</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                {(file.size / 1024).toFixed(0)} KB · PDF
              </p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
              <X size={13} /> Remove file
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isDragActive ? 'glowPulse 1s infinite' : 'none',
            }}>
              <Upload size={30} color="#a78bfa" />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '1rem', marginBottom: 4 }}>
                {isDragActive ? 'Drop your resume here!' : 'Drag & drop your resume'}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                or <span style={{ color: '#a78bfa', fontWeight: 600 }}>browse</span> to select · PDF only, max 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && !result && (
        <button className="btn btn-primary btn-lg" onClick={handleUpload} disabled={uploading}
          style={{ width: '100%', marginBottom: 24 }}>
          {uploading
            ? <><div className="spinner" /> Extracting skills with AI...</>
            : <><Brain size={20} /> Analyze Resume with AI</>}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="card card-accent animate-fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <CheckCircle size={22} color="#4ade80" />
            <h3 style={{ fontWeight: 700, color: '#f1f5f9' }}>Resume Parsed Successfully!</h3>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 12, fontWeight: 500 }}>
              🧠 {result.skills?.length} Skills Extracted:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(result.skills || []).map((skill, i) => (
                <span key={i} className="badge badge-purple">{skill}</span>
              ))}
              {(!result.skills || result.skills.length === 0) && (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No specific skills detected — interview questions will be resume-based.</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/interview', { state: { resume_id: result.resume.id, interview_type: 'technical' } })}>
              <Zap size={16} /> Start Technical Interview
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/interview', { state: { resume_id: result.resume.id, interview_type: 'hr' } })}>
              Start HR Interview <ArrowRight size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Steps */}
      {!result && (
        <div className="card" style={{ marginTop: 8 }}>
          <p style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 14, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How it works</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['1', 'Upload your latest PDF resume', '#8b5cf6'],
              ['2', 'Gemini AI extracts your skills, experience & tech stack', '#6366f1'],
              ['3', 'Choose your interview type (Technical, HR, or Mixed)', '#60a5fa'],
              ['4', 'Answer questions by typing or speaking out loud', '#4ade80'],
              ['5', 'Get AI-powered scores and actionable feedback', '#facc15'],
            ].map(([num, text, color]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: `${color}22`, border: `1px solid ${color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color,
                }}>{num}</div>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
