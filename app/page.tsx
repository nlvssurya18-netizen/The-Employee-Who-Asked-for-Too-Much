'use client';

import { useState } from 'react';
import { sampleScenarios, type AuditEvent, type DocumentRecord, type UserContext } from '@/lib/sample-data';

type ResearchResponse = {
  answer: string;
  citations: { documentId: string; title: string; version: string; effectiveDate: string }[];
  audit: AuditEvent[];
  stats: { candidates: number; authorized: number; excluded: number };
};

const emptyUser: UserContext = { user_id: '', role: '', department: '', clearance: 'Internal' };
const emptyDoc: DocumentRecord = { document_id: '', title: '', classification: 'Internal', allowed_departments: [], allowed_roles: [], version: '1.0', effective_date: '', content: '' };

export default function Home() {
  const [user, setUser] = useState<UserContext>(sampleScenarios[0].user);
  const [documents, setDocuments] = useState<DocumentRecord[]>(sampleScenarios[0].documents);
  const [prompt, setPrompt] = useState(sampleScenarios[0].prompt);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState(0);
  const [showDocs, setShowDocs] = useState(false);

  function loadScenario(index: number) {
    const scenario = sampleScenarios[index];
    setActiveScenario(index);
    setUser(scenario.user);
    setDocuments(scenario.documents);
    setPrompt(scenario.prompt);
    setResult(null);
  }

  function updateUser(key: keyof UserContext, value: string) {
    setUser((current) => ({ ...current, [key]: value }));
  }

  function updateDoc(index: number, key: keyof DocumentRecord, value: string) {
    setDocuments((current) => current.map((doc, docIndex) => docIndex === index ? { ...doc, [key]: value } : doc));
  }

  async function runResearch() {
    setLoading(true);
    try {
      const response = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, documents, prompt }) });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><span>Sentinel <em>Research</em></span></div>
        <div className="topbar-meta"><span className="live-dot" /> Authorization gateway online <span className="divider" /> v1.0.0</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-line" /> SECURE ENTERPRISE RESEARCH</div>
        <h1>Ask freely.<br /><span>Share carefully.</span></h1>
        <p className="hero-copy">Evidence-backed answers, assembled only from documents your employee is allowed to see.</p>
        <div className="scenario-tabs" role="tablist" aria-label="Test scenarios">
          {sampleScenarios.map((scenario, index) => <button key={scenario.label} className={activeScenario === index ? 'scenario active' : 'scenario'} onClick={() => loadScenario(index)}><span className="scenario-number">0{index + 1}</span><span><strong>{scenario.label}</strong><small>{scenario.description}</small></span></button>)}
        </div>
      </section>

      <section className="workspace">
        <div className="panel query-panel">
          <div className="panel-header"><div><span className="panel-kicker">01 / REQUEST CONTEXT</span><h2>Who is asking?</h2></div><span className="shield-badge">Protected</span></div>
          <div className="field-grid">
            <label>User ID<input value={user.user_id} onChange={(event) => updateUser('user_id', event.target.value)} /></label>
            <label>Role<input value={user.role} onChange={(event) => updateUser('role', event.target.value)} /></label>
            <label>Department<input value={user.department} onChange={(event) => updateUser('department', event.target.value)} /></label>
            <label>Clearance<select value={user.clearance} onChange={(event) => updateUser('clearance', event.target.value)}><option>Public</option><option>Internal</option><option>Confidential</option><option>Restricted</option></select></label>
          </div>
          <label className="prompt-label">Research question<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} /></label>
          <button className="run-button" onClick={runResearch} disabled={loading || !prompt.trim()}><span>{loading ? 'Evaluating access...' : 'Run secure research'}</span><span className="arrow">-&gt;</span></button>
          <p className="privacy-note"><span>◎</span> Document content is filtered before synthesis. Unauthorized content never enters the model context.</p>
        </div>

        <div className="panel result-panel">
          <div className="panel-header"><div><span className="panel-kicker">02 / EVIDENCE SYNTHESIS</span><h2>Research result</h2></div>{result && <span className="result-status">Complete</span>}</div>
          {!result ? <div className="empty-result"><div className="empty-orbit"><span>⌁</span></div><h3>Ready when you are</h3><p>Run a question to see the answer, authorized evidence, and the access decisions that shaped it.</p></div> : <ResultView result={result} />}
        </div>
      </section>

      <section className="audit-section">
        <div className="audit-heading"><div><span className="panel-kicker">03 / CONTROL PLANE</span><h2>Evidence &amp; audit trail</h2></div><button className="text-button" onClick={() => setShowDocs(!showDocs)}>{showDocs ? 'Hide documents' : 'Inspect documents'} <span>-&gt;</span></button></div>
        {showDocs && <div className="document-table"><div className="table-head"><span>Document</span><span>Classification</span><span>Access scope</span><span>Version</span></div>{documents.map((doc, index) => <div className="table-row" key={`${doc.document_id}-${index}`}><input value={doc.document_id} onChange={(event) => updateDoc(index, 'document_id', event.target.value)} /><span className={`classification ${doc.classification.toLowerCase()}`}>{doc.classification}</span><span>{doc.allowed_departments.join(', ') || 'Any department'} / {doc.allowed_roles.join(', ') || 'Any role'}</span><span>v{doc.version}</span></div>)}</div>}
        {!showDocs && !result && <div className="audit-placeholder"><span className="lock-icon">□</span><span>Every request produces a decision trail with candidate, authorization, and evidence events.</span></div>}
        {result && <AuditTrail events={result.audit} />}
      </section>
      <footer><span>Sentinel Research</span><span>Least privilege by construction</span><span>Local evaluation mode</span></footer>
    </main>
  );
}

function ResultView({ result }: { result: ResearchResponse }) {
  return <div className="result-content"><div className="answer-label"><span className="answer-pulse" /> ANSWER</div><p className="answer">{result.answer}</p><div className="result-stats"><span><strong>{result.stats.authorized}</strong> authorized</span><span><strong>{result.stats.excluded}</strong> excluded</span><span><strong>{result.citations.length}</strong> citations</span></div>{result.citations.length > 0 && <div className="citations"><span className="mini-label">AUTHORIZED SOURCES</span>{result.citations.map((citation) => <div className="citation" key={citation.documentId}><span className="citation-icon">↗</span><span><strong>{citation.title}</strong><small>{citation.documentId} · v{citation.version} · effective {citation.effectiveDate}</small></span></div>)}</div>}</div>;
}

function AuditTrail({ events }: { events: AuditEvent[] }) {
  return <div className="audit-list">{events.map((event, index) => <div className="audit-row" key={`${event.timestamp}-${index}`}><span className={`audit-icon ${event.type}`}>{event.type === 'authorization' ? '✓' : event.type === 'excluded' ? '×' : '→'}</span><span className="audit-time">{event.timestamp}</span><span className="audit-event"><strong>{event.type === 'authorization' ? 'Authorization decision' : event.type === 'excluded' ? 'Content withheld' : 'Candidate evaluated'}</strong><small>{event.detail}</small></span><span className={`audit-tag ${event.outcome}`}>{event.outcome}</span></div>)}</div>;
}
