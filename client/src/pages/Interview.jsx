import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Volume2, VolumeX, ChevronRight,
  Brain, StopCircle, Loader, MessageSquare, SkipForward, CheckCircle
} from 'lucide-react';

const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startListening = () => {
    if (!supported) return toast.error('Speech recognition not supported in this browser.');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setTranscript(prev => prev + final);
    };
    r.onerror = () => { setListening(false); };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const resetTranscript = () => setTranscript('');

  return { transcript, listening, supported, startListening, stopListening, resetTranscript, setTranscript };
};

const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1;
  utt.lang = 'en-US';
  // prefer a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
};

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: paramSessionId } = useParams();

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [savedAnswers, setSavedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const { transcript, listening, supported, startListening, stopListening, resetTranscript, setTranscript } = useSpeechRecognition();

  // Sync speech transcript into answer box
  useEffect(() => {
    if (transcript) setAnswer(transcript);
  }, [transcript]);

  // Start or restore session
  useEffect(() => {
    const init = async () => {
      const state = location.state;
      if (state?.resume_id) {
        try {
          const res = await api.post('/interview/start', {
            resume_id: state.resume_id,
            interview_type: state.interview_type || 'technical',
          });
          setSessionId(res.data.session_id);
          setQuestions(res.data.questions);
          if (ttsEnabled && res.data.questions.length > 0) {
            setTimeout(() => speak(res.data.questions[0].question), 800);
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to start interview');
          navigate('/upload');
        }
      } else if (paramSessionId) {
        try {
          const res = await api.get(`/interview/sessions/${paramSessionId}`);
          setSessionId(parseInt(paramSessionId));
          setQuestions(res.data.qa);
          const ans = {};
          res.data.qa.forEach(q => { if (q.answer) ans[q.id] = q.answer; });
          setSavedAnswers(ans);
        } catch {
          toast.error('Session not found');
          navigate('/dashboard');
        }
      } else {
        navigate('/upload');
      }
      setLoading(false);
    };
    init();
    return () => window.speechSynthesis?.cancel();
  }, []);

  const saveCurrentAnswer = async () => {
    const q = questions[current];
    if (!q || !answer.trim()) return;
    try {
      await api.post('/interview/answer', { qa_id: q.id, answer: answer.trim() });
      setSavedAnswers(prev => ({ ...prev, [q.id]: answer.trim() }));
    } catch { /* silent */ }
  };

  const goNext = async () => {
    if (submitting) return;
    setSubmitting(true);
    await saveCurrentAnswer();
    setAnswer('');
    resetTranscript();
    const next = current + 1;
    if (next < questions.length) {
      setCurrent(next);
      if (ttsEnabled) setTimeout(() => speak(questions[next].question), 400);
    } else {
      toast('All questions answered! Click "End Interview" to get your results.', { icon: '✅' });
    }
    setSubmitting(false);
  };

  const getFollowUp = async () => {
    if (submitting) return;
    setSubmitting(true);
    await saveCurrentAnswer();
    try {
      const res = await api.post('/interview/follow-up', { session_id: sessionId });
      const newQ = res.data;
      setQuestions(prev => [...prev, newQ]);
      const idx = questions.length;
      setCurrent(idx);
      setAnswer('');
      resetTranscript();
      if (ttsEnabled) setTimeout(() => speak(newQ.question), 400);
      toast.success('Follow-up question generated!');
    } catch (err) {
      toast.error('Failed to generate follow-up');
    }
    setSubmitting(false);
  };

  const endInterview = async () => {
    setEnding(true);
    await saveCurrentAnswer();
    try {
      const res = await api.post('/interview/end', { session_id: sessionId });
      toast.success('🎯 Interview complete! View your results.');
      navigate(`/analytics/${sessionId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to evaluate session');
    }
    setEnding(false);
  };

  const toggleMic = () => {
    if (listening) { stopListening(); } else { resetTranscript(); setAnswer(''); startListening(); }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glowPulse 2s infinite' }}>
          <Brain size={28} color="#fff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Generating your questions...</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Gemini AI is analyzing your resume</p>
        </div>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const currentQ = questions[current];
  const totalQ = questions.length;
  const progress = totalQ > 0 ? ((current + 1) / totalQ) * 100 : 0;
  const answeredCount = Object.keys(savedAnswers).length;

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>
            <span className="gradient-text">AI Interview</span> Session
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>
            Question {current + 1} of {totalQ} · {answeredCount} answered
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) window.speechSynthesis?.cancel(); }} title={ttsEnabled ? 'Mute TTS' : 'Enable TTS'}>
            {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {ttsEnabled ? 'Audio On' : 'Muted'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={endInterview} disabled={ending}>
            {ending ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Evaluating...</> : <><StopCircle size={14} /> End Interview</>}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8b5cf6, #6366f1)', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="card card-accent animate-fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            }}>
              <Brain size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="badge badge-purple">Q{current + 1}</span>
                <button onClick={() => speak(currentQ.question)} title="Replay question"
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}>
                  <Volume2 size={15} />
                </button>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '1.05rem', lineHeight: 1.7, fontWeight: 500 }}>
                {currentQ.question}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Answer Area */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquare size={16} color="#94a3b8" />
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#94a3b8' }}>Your Answer</span>
          {savedAnswers[currentQ?.id] && <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Saved</span>}
        </div>

        <textarea
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); setTranscript(e.target.value); }}
          placeholder="Type your answer here, or use the microphone button below to speak..."
          rows={6}
          className="form-input"
          style={{ width: '100%', resize: 'vertical', lineHeight: 1.7, fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' }}
        />

        {/* Mic Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          {supported && (
            <button onClick={toggleMic} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              background: listening ? 'rgba(248,113,113,0.15)' : 'rgba(139,92,246,0.15)',
              color: listening ? '#f87171' : '#a78bfa',
              border: `1px solid ${listening ? 'rgba(248,113,113,0.3)' : 'rgba(139,92,246,0.3)'}`,
              animation: listening ? 'recordingPulse 1.5s infinite' : 'none',
              transition: 'all 0.2s',
            }}>
              {listening ? <><MicOff size={16} /> Stop Recording</> : <><Mic size={16} /> {answer ? 'Continue Speaking' : 'Speak Your Answer'}</>}
            </button>
          )}
          {listening && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: '#f87171',
                  height: `${8 + Math.random() * 16}px`,
                  animation: `pulse ${0.5 + i * 0.1}s ease infinite alternate`,
                }} />
              ))}
              <span style={{ color: '#f87171', fontSize: '0.78rem', marginLeft: 6, fontWeight: 500 }}>Listening...</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={goNext} disabled={submitting || !answer.trim()}>
          {submitting ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> :
            current < totalQ - 1
              ? <><ChevronRight size={17} /> Save & Next Question</>
              : <><CheckCircle size={17} /> Save Final Answer</>}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={getFollowUp} disabled={submitting}>
          {submitting ? <Loader size={14} className="animate-spin" /> : <SkipForward size={14} />} Get Follow-up
        </button>

        {/* Previous / Other answers */}
        {questions.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setCurrent(Math.max(0, current - 1)); setAnswer(savedAnswers[questions[current - 1]?.id] || ''); }} disabled={current === 0}>
              ← Prev
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setCurrent(Math.min(totalQ - 1, current + 1)); setAnswer(savedAnswers[questions[current + 1]?.id] || ''); }} disabled={current === totalQ - 1}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Q Progress Pills */}
      {questions.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 24 }}>
          {questions.map((q, i) => (
            <button key={q.id} onClick={() => { if (i !== current) { setCurrent(i); setAnswer(savedAnswers[q.id] || ''); } }}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                background: i === current ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : savedAnswers[q.id] ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
                color: i === current ? '#fff' : savedAnswers[q.id] ? '#4ade80' : '#64748b',
                border: i === current ? 'none' : savedAnswers[q.id] ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
