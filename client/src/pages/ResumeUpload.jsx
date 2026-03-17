import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Upload, FileText, CheckCircle, Brain, Zap, ArrowRight, X,
  GraduationCap, Briefcase, Code2, FolderGit2, Award, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Sub-components ──────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: `${color}18`, border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>{icon}</div>
    <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{title}</span>
    {count !== undefined && (
      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: 999 }}>
        {count} found
      </span>
    )}
  </div>
);

const SkillPill = ({ label, color = '#8b5cf6' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 999,
    fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em',
    background: `${color}18`, color, border: `1px solid ${color}30`,
  }}>{label}</span>
);

const SkillGroup = ({ label, items, color }) => {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((s, i) => <SkillPill key={i} label={s} color={color} />)}
      </div>
    </div>
  );
};

const ExperienceCard = ({ exp }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '14px 16px', marginBottom: 10,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
      <div>
        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{exp.role}</p>
        <p style={{ color: '#a78bfa', fontSize: '0.82rem', fontWeight: 600 }}>{exp.company}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 6 }}>{exp.duration}</span>
        {exp.type && <p style={{ fontSize: '0.72rem', color: '#4ade80', marginTop: 3 }}>{exp.type}</p>}
      </div>
    </div>
    {exp.highlights && exp.highlights.length > 0 && (
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        {exp.highlights.map((h, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.5 }}>
            <span style={{ color: '#a78bfa', flexShrink: 0 }}>›</span> {h}
          </li>
        ))}
      </ul>
    )}
    {exp.technologies && exp.technologies.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
        {exp.technologies.map((t, i) => <SkillPill key={i} label={t} color="#60a5fa" />)}
      </div>
    )}
  </div>
);

const EducationCard = ({ edu }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '14px 16px', marginBottom: 10,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
      <div>
        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{edu.degree}</p>
        <p style={{ color: '#4ade80', fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{edu.institution}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {edu.year && <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 6 }}>{edu.year}</span>}
        {edu.grade && <p style={{ fontSize: '0.75rem', color: '#facc15', marginTop: 3, fontWeight: 600 }}>{edu.grade}</p>}
      </div>
    </div>
    {edu.highlights && edu.highlights.length > 0 && (
      <ul style={{ listStyle: 'none', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {edu.highlights.map((h, i) => (
          <li key={i} style={{ color: '#64748b', fontSize: '0.8rem' }}>• {h}</li>
        ))}
      </ul>
    )}
  </div>
);

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('skills');
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) { setFile(acceptedFiles[0]); setResult(null); }
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
      setActiveTab('skills');
      toast.success('✅ Resume parsed! Skills, education & experience extracted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const parsed = result?.parsed;
  const skills = parsed?.skills || {};
  const allSkills = parsed?.all_skills_flat || [];
  const education = parsed?.education || [];
  const experience = parsed?.experience || [];
  const projects = parsed?.projects || [];
  const certifications = parsed?.certifications || [];

  const TABS = [
    { key: 'skills', label: 'Skills', icon: <Code2 size={14} />, count: allSkills.length },
    { key: 'experience', label: 'Experience', icon: <Briefcase size={14} />, count: experience.length },
    { key: 'education', label: 'Education', icon: <GraduationCap size={14} />, count: education.length },
    { key: 'projects', label: 'Projects', icon: <FolderGit2 size={14} />, count: projects.length },
  ];

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }} className="animate-fade-up">
        <h1 className="section-title" style={{ fontSize: '1.9rem' }}>
          Resume <span className="gradient-text">Parser</span>
        </h1>
        <p className="section-subtitle">
          Upload your PDF — BrainHire extracts skills, education, and experience via AI and stores it for personalised interviews.
        </p>

        {/* Pipeline Diagram */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {[
            { label: 'PDF Upload', color: '#a78bfa' },
            { label: 'pdf-parse', color: '#60a5fa' },
            { label: 'Gemini API', color: '#4ade80' },
            { label: 'Skills · Education · Experience', color: '#facc15' },
            { label: 'PostgreSQL', color: '#fb923c' },
          ].map((step, i, arr) => (
            <React.Fragment key={i}>
              <span style={{
                padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
                background: `${step.color}15`, border: `1px solid ${step.color}33`, color: step.color,
              }}>{step.label}</span>
              {i < arr.length - 1 && <span style={{ color: '#334155', fontSize: '0.8rem' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      {!result && (
        <div {...getRootProps()} style={{
          border: `2px dashed ${isDragActive ? '#8b5cf6' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 18, padding: '48px 32px', textAlign: 'center',
          background: isDragActive ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
          cursor: 'pointer', transition: 'all 0.3s', marginBottom: 20,
          boxShadow: isDragActive ? '0 0 40px rgba(139,92,246,0.2)' : 'none',
        }}>
          <input {...getInputProps()} />
          {file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={26} color="#4ade80" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f1f5f9' }}>{file.name}</p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={13} /> Remove
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.1))', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={30} color="#a78bfa" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{isDragActive ? 'Drop it!' : 'Drag & drop your resume'}</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>or <span style={{ color: '#a78bfa', fontWeight: 600 }}>browse</span> · PDF only, max 10MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      {file && !result && (
        <button className="btn btn-primary btn-lg" onClick={handleUpload} disabled={uploading} style={{ width: '100%', marginBottom: 24 }}>
          {uploading
            ? <><div className="spinner" /> Extracting with AI — this may take a moment...</>
            : <><Brain size={20} /> Parse Resume with Gemini AI</>}
        </button>
      )}

      {/* Parsed Results */}
      {result && parsed && (
        <div className="animate-fade-up">
          {/* Summary Banner */}
          <div className="card card-accent" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle size={20} color="#4ade80" />
              <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Resume Parsed Successfully</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>{result.resume.filename}</span>
            </div>
            {parsed.summary && (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, borderLeft: '3px solid rgba(139,92,246,0.4)', paddingLeft: 14 }}>
                {parsed.summary}
              </p>
            )}
            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
              {[
                { label: 'Skills', value: allSkills.length, color: '#a78bfa' },
                { label: 'Experience', value: experience.length, color: '#60a5fa' },
                { label: 'Education', value: education.length, color: '#4ade80' },
                { label: 'Projects', value: projects.length, color: '#facc15' },
                { label: 'Certifications', value: certifications.length, color: '#fb923c' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                background: activeTab === t.key ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'transparent',
                color: activeTab === t.key ? '#fff' : '#64748b',
              }}>
                {t.icon} {t.label}
                {t.count > 0 && <span style={{ background: activeTab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '0 6px', fontSize: '0.7rem' }}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* SKILLS TAB */}
          {activeTab === 'skills' && (
            <div className="card">
              <SectionHeader icon={<Code2 size={16} />} title="Extracted Skills" count={allSkills.length} color="#a78bfa" />
              <SkillGroup label="Technical Skills" items={skills.technical} color="#a78bfa" />
              <SkillGroup label="Programming Languages" items={skills.languages} color="#60a5fa" />
              <SkillGroup label="Frameworks & Libraries" items={skills.frameworks} color="#4ade80" />
              <SkillGroup label="Tools & Platforms" items={skills.tools} color="#fb923c" />
              <SkillGroup label="Soft Skills" items={skills.soft} color="#facc15" />
              {certifications.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <SkillGroup label="Certifications" items={certifications} color="#f472b6" />
                </div>
              )}
              {allSkills.length === 0 && (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No specific skills detected. Questions will be resume-based.</p>
              )}
            </div>
          )}

          {/* EXPERIENCE TAB */}
          {activeTab === 'experience' && (
            <div className="card">
              <SectionHeader icon={<Briefcase size={16} />} title="Work Experience" count={experience.length} color="#60a5fa" />
              {experience.length > 0
                ? experience.map((exp, i) => <ExperienceCard key={i} exp={exp} />)
                : <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No work experience found in the resume.</p>
              }
            </div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === 'education' && (
            <div className="card">
              <SectionHeader icon={<GraduationCap size={16} />} title="Education" count={education.length} color="#4ade80" />
              {education.length > 0
                ? education.map((edu, i) => <EducationCard key={i} edu={edu} />)
                : <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No education entries found in the resume.</p>
              }
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="card">
              <SectionHeader icon={<FolderGit2 size={16} />} title="Projects" count={projects.length} color="#facc15" />
              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {projects.map((p, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.92rem' }}>{p.name}</p>
                        {p.link && p.link !== '' && (
                          <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 500 }}>GitHub →</a>
                        )}
                      </div>
                      {p.description && <p style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 8 }}>{p.description}</p>}
                      {p.technologies && p.technologies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {p.technologies.map((t, j) => <SkillPill key={j} label={t} color="#facc15" />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No projects found in the resume.</p>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate('/interview', { state: { resume_id: result.resume.id, interview_type: 'technical' } })}>
              <Zap size={16} /> Start Technical Interview
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/interview', { state: { resume_id: result.resume.id, interview_type: 'hr' } })}>
              Start HR Interview <ArrowRight size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setResult(null); }}>
              <Upload size={14} /> Upload Another
            </button>
          </div>
        </div>
      )}

      {/* How it works — shown only before upload */}
      {!result && !file && (
        <div className="card" style={{ marginTop: 8 }}>
          <p style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 14, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parsing Pipeline</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['1', 'Upload your PDF resume (up to 10MB)', '#8b5cf6'],
              ['2', 'pdf-parse extracts raw text from the document', '#6366f1'],
              ['3', 'Gemini AI structures text into skills, education & experience JSON', '#60a5fa'],
              ['4', 'Structured data stored in PostgreSQL for personalised sessions', '#4ade80'],
              ['5', 'AI generates interview questions tailored to your exact background', '#facc15'],
            ].map(([num, text, color]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color }}>{num}</div>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
