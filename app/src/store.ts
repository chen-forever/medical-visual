import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEMO_ANALYSIS,
  DEMO_FORMULA,
  DEMO_LESIONS,
  DEMO_PATIENT,
  ORGAN_IDS,
  SIMULATION,
} from './data';
import type { AnalysisMeta, AnalysisResult, Formula, Lesion, Patient, StepId } from './types';
import type { CaseDetail } from './api/casesClient';

interface CaseStore {
  caseId: string | null;
  caseVersion: number;
  patient: Patient;
  analysis: AnalysisResult;
  analysisMeta: AnalysisMeta;
  analysisReady: boolean;
  primaryPatternId: string;
  lesions: Lesion[];
  formula: Formula;
  horizon: 7 | 14 | 30;
  completed: StepId[];
  setPatient: (patient: Patient) => void;
  setAnalysis: (analysis: AnalysisResult, meta: AnalysisMeta) => void;
  setPrimaryPattern: (id: string) => void;
  setLesions: (lesions: Lesion[]) => void;
  addLesion: (lesion: Lesion) => void;
  removeLesion: (id: string) => void;
  setFormula: (formula: Formula) => void;
  setHorizon: (horizon: 7 | 14 | 30) => void;
  setCaseRef: (caseId: string, version: number) => void;
  hydrateCase: (detail: CaseDetail) => void;
  markAnalysisStale: () => void;
  startNewCase: () => void;
  markComplete: (step: StepId) => void;
  resetDemo: () => void;
}

const DEMO_META: AnalysisMeta = {
  provider: 'demo',
  model: '演示规则数据',
  latencyMs: 0,
  fallback: true,
  promptVersion: 'demo',
};

const EMPTY_FORMULA: Formula = {
  name: '',
  herbs: [],
  decoction: '',
  courseDays: 14,
  note: '',
};

const initial = {
  caseId: null as string | null,
  caseVersion: 0,
  patient: DEMO_PATIENT,
  analysis: DEMO_ANALYSIS,
  analysisMeta: DEMO_META,
  analysisReady: true,
  primaryPatternId: DEMO_ANALYSIS.primaryId,
  lesions: DEMO_LESIONS,
  formula: DEMO_FORMULA,
  horizon: 14 as const,
  completed: ['home', 'patient', 'analysis'] as StepId[],
};

export const useCaseStore = create<CaseStore>()(
  persist(
    (set, get) => ({
      ...initial,
      setPatient: patient => set({ patient }),
      setAnalysis: (analysis, analysisMeta) =>
        set({
          analysis,
          analysisMeta,
          analysisReady: true,
          primaryPatternId: analysis.primaryId || analysis.patterns[0]?.id || '',
        }),
      setPrimaryPattern: primaryPatternId => set({ primaryPatternId }),
      setLesions: lesions => set({ lesions }),
      addLesion: lesion => set({ lesions: [...get().lesions, lesion] }),
      removeLesion: id => set({ lesions: get().lesions.filter(l => l.id !== id) }),
      setFormula: formula => set({ formula }),
      setHorizon: horizon => set({ horizon }),
      setCaseRef: (caseId, caseVersion) => set({ caseId, caseVersion }),
      markAnalysisStale: () => set({ analysisReady: false }),
      hydrateCase: detail => {
        const latestAnalysis = detail.analyses.find(
          item => (item.caseVersion ?? detail.case.version) === detail.case.version,
        );
        const latestFormula = detail.formulas[0];
        const analysis = latestAnalysis?.analysis ?? get().analysis;
        const analysisMeta: AnalysisMeta = latestAnalysis
          ? {
              provider:
                latestAnalysis.provider === 'rules' ? 'rules' : 'deepseek',
              model: latestAnalysis.model,
              latencyMs: latestAnalysis.latencyMs,
              fallback: false,
              promptVersion: latestAnalysis.promptVersion,
              ...(analysis.redFlags.length ? { blocked: true } : {}),
            }
          : { ...DEMO_META };
        set({
          caseId: detail.case.id,
          caseVersion: detail.case.version,
          patient: detail.case.patient,
          lesions: detail.case.lesions,
          analysis,
          analysisMeta,
          analysisReady: Boolean(latestAnalysis),
          primaryPatternId: analysis.primaryId || analysis.patterns[0]?.id || '',
          formula: latestFormula?.formula ?? { ...EMPTY_FORMULA },
          completed: latestAnalysis
            ? ['home', 'patient', 'analysis']
            : ['home', 'patient'],
        });
      },
      startNewCase: () =>
        set({
          ...initial,
          caseId: null,
          caseVersion: 0,
          analysisReady: false,
          formula: { ...EMPTY_FORMULA },
          completed: ['home'],
        }),
      markComplete: step =>
        set(state => ({
          completed: state.completed.includes(step)
            ? state.completed
            : [...state.completed, step],
        })),
      resetDemo: () => set({ ...initial }),
    }),
    {
      name: 'qihuang-case-v1',
      version: 4,
      migrate: persisted => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const state = persisted as Partial<CaseStore>;
        const allowed = new Set(ORGAN_IDS);
        return {
          ...state,
          caseId: state.caseId ?? null,
          caseVersion: state.caseVersion ?? 0,
          analysisReady: state.analysisReady ?? true,
          analysisMeta: state.analysisMeta ?? { ...DEMO_META },
          lesions: Array.isArray(state.lesions)
            ? state.lesions.filter(lesion => allowed.has(lesion.organId))
            : [],
        };
      },
      partialize: state => ({
        caseId: state.caseId,
        caseVersion: state.caseVersion,
        patient: state.patient,
        analysis: state.analysis,
        analysisMeta: state.analysisMeta,
        analysisReady: state.analysisReady,
        primaryPatternId: state.primaryPatternId,
        lesions: state.lesions,
        formula: state.formula,
        horizon: state.horizon,
        completed: state.completed,
      }),
    },
  ),
);

export function usePrimaryPattern() {
  return useCaseStore(state => {
    const pattern = state.analysis.patterns.find(p => p.id === state.primaryPatternId);
    return pattern ?? state.analysis.patterns[0];
  });
}

export { SIMULATION };
