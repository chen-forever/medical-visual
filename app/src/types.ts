export type StepId =
  | 'home'
  | 'patient'
  | 'analysis'
  | 'body'
  | 'inside'
  | 'lesion'
  | 'state'
  | 'formula'
  | 'timeline'
  | 'report';

export type Sex = 'female' | 'male' | 'other';

export interface Patient {
  alias: string;
  age: number | '';
  sex: Sex;
  chiefComplaint: string;
  inspection: string;
  listening: string;
  inquiry: string;
  palpation: string;
  tags: string[];
}

export interface Pattern {
  id: string;
  name: string;
  confidence: number;
  summary: string;
  evidence: string[];
  organs: string[];
  meridians: string[];
  rationale: string;
  caution?: string;
}

export interface AnalysisResult {
  patterns: Pattern[];
  primaryId: string;
  redFlags: string[];
  missingInfo: string[];
  generatedAt: string;
  modelLabel: string;
  disclaimer: string;
}

export interface Herb {
  id: string;
  name: string;
  dose: string;
  role: string;
}

export interface Formula {
  name: string;
  herbs: Herb[];
  decoction: string;
  courseDays: 7 | 14 | 30;
  note: string;
}

export interface SimulationPoint {
  day: number;
  label: string;
  score: number;
  sleep: number;
  appetite: number;
  energy: number;
  damp: number;
  note: string;
}

export interface Lesion {
  id: string;
  organId: string;
  label: string;
  severity: '主要' | '次要' | '观察';
  evidence: string;
}

export interface OrganMeta {
  id: string;
  label: string;
  system: string;
  color: string;
  meridian: string;
  tcmOrgan: string;
  description: string;
  concepts: string[];
}
