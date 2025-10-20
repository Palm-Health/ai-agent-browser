// Precompiled patterns; extend as needed per region
export const RX = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  ccLike: /\b(?:\d[ -]?){13,19}\b/,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/,
  phoneUS: /(?<!\d)(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/,
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  abaRouting9: /\b\d{9}\b/,          // use with surrounding context word "routing"
  mrnLike: /\b(?:MRN|Med(?:ical)?\s*Record)\s*[:#]?\s*\w+\b/i,
};

export const PRIVACY_TERMS = {
  medical: ['hipaa','phi','patient','diagnosis','ehr','prescription','icd-10','cpt','mrn'],
  financial: ['ssn','routing','account number','bank','ach','iban','swift','w-2','1040','credit card','cvv'],
  personal: ['password','pin','private','confidential','proprietary'],
};

export function foldDiacritics(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function wordBoundary(hay: string, needle: string) {
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(hay);
}

export function containsAny(hay: string, needles: string[]) {
  return needles.some(w => wordBoundary(hay, w));
}

function escapeRegExp(s: string){ 
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

export type PrivacyDomain = 'medical'|'financial'|'personal';

export function detectPrivacySignals(text: string) {
  const lower = foldDiacritics(text);
  const patterns = {
    ssn: RX.ssn.test(lower),
    cc: RX.ccLike.test(lower),
    iban: RX.iban.test(lower),
    email: RX.email.test(lower),
    phone: RX.phoneUS.test(lower),
    routing9: RX.abaRouting9.test(lower),
    mrn: RX.mrnLike.test(text),
  };
  const keywords = {
    medical: containsAny(lower, PRIVACY_TERMS.medical),
    financial: containsAny(lower, PRIVACY_TERMS.financial),
    personal: containsAny(lower, PRIVACY_TERMS.personal),
  };

  const domains: PrivacyDomain[] = [];
  if (keywords.medical || patterns.mrn) domains.push('medical');
  if (keywords.financial || patterns.cc || patterns.iban || patterns.routing9) domains.push('financial');
  if (keywords.personal || patterns.email || patterns.phone || patterns.ssn) domains.push('personal');

  const requiresPrivacy = Object.values(patterns).some(Boolean) || domains.length > 0;
  return { requiresPrivacy, domains, summary: { patterns, keywords } }; // PII-safe summary
}
