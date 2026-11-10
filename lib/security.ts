import type { AuditEvent, Clearance, DocumentRecord, UserContext } from './sample-data';

const clearanceRank: Record<Clearance, number> = { Public: 0, Internal: 1, Confidential: 2, Restricted: 3 };

type ScoredDocument = DocumentRecord & { score: number };

function tokenize(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

function relevanceScore(prompt: string, document: DocumentRecord) {
  const terms = tokenize(prompt);
  const searchable = tokenize(`${document.title} ${document.content}`);
  let score = 0;
  terms.forEach((term) => { if (searchable.has(term)) score += document.title.toLowerCase().includes(term) ? 3 : 1; });
  return score;
}

export function isAuthorized(user: UserContext, document: DocumentRecord) {
  const clearanceAllowed = clearanceRank[user.clearance] >= clearanceRank[document.classification];
  const departmentAllowed = document.allowed_departments.length === 0 || document.allowed_departments.includes(user.department);
  const roleAllowed = document.allowed_roles.length === 0 || document.allowed_roles.includes(user.role);
  return clearanceAllowed && departmentAllowed && roleAllowed;
}

function versionValue(version: string) {
  return version.split('.').map((part) => Number(part) || 0).reduce((total, part) => total * 100 + part, 0);
}

export function conductResearch(user: UserContext, documents: DocumentRecord[], prompt: string) {
  const audit: AuditEvent[] = [];
  const candidates: ScoredDocument[] = documents.map((document) => ({ ...document, score: relevanceScore(prompt, document) })).filter((document) => document.score > 0);
  const timestamp = new Date().toISOString().slice(11, 19);
  candidates.forEach((document) => audit.push({ timestamp, type: 'candidate', outcome: 'reviewed', detail: `${document.document_id} matched the question (${document.score} relevance points)` }));

  const authorized = candidates.filter((document) => isAuthorized(user, document));
  const excluded = candidates.filter((document) => !isAuthorized(user, document));
  authorized.forEach((document) => audit.push({ timestamp, type: 'authorization', outcome: 'allowed', detail: `${document.document_id} passed clearance, department, and role policy` }));
  excluded.forEach((document) => audit.push({ timestamp, type: 'excluded', outcome: 'denied', detail: `${document.document_id} withheld before synthesis: authorization policy denied access` }));

  const latestByTitle = new Map<string, ScoredDocument>();
  authorized.sort((left, right) => new Date(right.effective_date).getTime() - new Date(left.effective_date).getTime() || versionValue(right.version) - versionValue(left.version)).forEach((document) => {
    if (!latestByTitle.has(document.title)) latestByTitle.set(document.title, document);
  });
  const evidence = Array.from(latestByTitle.values());
  let answer = 'I could not find an answer in the documents you are authorized to access.';
  if (evidence.length > 0) {
    answer = evidence.length === 1 ? evidence[0].content : `The latest authorized forecast is ${evidence[0].content.replace(/^.*?is /i, '').replace(/[.]$/, '')}. This supersedes an earlier version dated ${authorized[1]?.effective_date ?? 'earlier'}.`;
  }

  return { answer, citations: evidence.map(({ document_id, title, version, effective_date }) => ({ documentId: document_id, title, version, effectiveDate: effective_date })), audit, stats: { candidates: candidates.length, authorized: authorized.length, excluded: excluded.length } };
}
