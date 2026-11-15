import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, validatePatient } from './schema.mjs';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = resolve(SERVER_DIR, 'data', 'qihuang.sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  age INTEGER,
  sex TEXT NOT NULL DEFAULT 'other',
  chief_complaint TEXT NOT NULL,
  inspection TEXT NOT NULL DEFAULT '',
  listening TEXT NOT NULL DEFAULT '',
  inquiry TEXT NOT NULL DEFAULT '',
  palpation TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  lesions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  case_version INTEGER NOT NULL DEFAULT 1,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  herbs_json TEXT NOT NULL DEFAULT '[]',
  decoction TEXT NOT NULL DEFAULT '',
  course_days INTEGER NOT NULL DEFAULT 14,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  analysis_id TEXT,
  formula_id TEXT,
  snapshot_json TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT,
  actor TEXT NOT NULL DEFAULT 'doctor',
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analyses_case ON analyses(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_formulas_case ON formulas(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_case ON reports(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_updated ON cases(updated_at DESC);
`;

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCase(row) {
  if (!row) return null;
  return {
    id: row.id,
    patient: {
      alias: row.alias,
      age: row.age ?? '',
      sex: row.sex,
      chiefComplaint: row.chief_complaint,
      inspection: row.inspection,
      listening: row.listening,
      inquiry: row.inquiry,
      palpation: row.palpation,
      tags: parseJson(row.tags_json, []),
    },
    lesions: parseJson(row.lesions_json, []),
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createStore(dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  db.exec('PRAGMA user_version = 1;');

  const findCase = id =>
    db.prepare('SELECT * FROM cases WHERE id = ? AND deleted_at IS NULL').get(id);

  const recordEvent = (caseId, action, detail = {}) => {
    db.prepare(
      'INSERT INTO events(case_id, actor, action, detail_json, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(caseId, 'doctor', action, JSON.stringify(detail), now());
  };

  const listAnalyses = caseId =>
    db
      .prepare('SELECT * FROM analyses WHERE case_id = ? ORDER BY created_at DESC, rowid DESC')
      .all(caseId)
      .map(row => ({
        id: row.id,
        provider: row.provider,
        model: row.model,
        promptVersion: row.prompt_version,
        latencyMs: row.latency_ms,
        caseVersion: row.case_version,
        analysis: parseJson(row.result_json, null),
        createdAt: row.created_at,
      }));

  const listFormulas = caseId =>
    db
      .prepare('SELECT * FROM formulas WHERE case_id = ? ORDER BY created_at DESC, rowid DESC')
      .all(caseId)
      .map(row => ({
        id: row.id,
        formula: {
          name: row.name,
          herbs: parseJson(row.herbs_json, []),
          decoction: row.decoction,
          courseDays: row.course_days,
          note: row.note,
        },
        createdAt: row.created_at,
      }));

  const listReports = caseId =>
    db
      .prepare('SELECT id, analysis_id, formula_id, share_token, created_at FROM reports WHERE case_id = ? ORDER BY created_at DESC, rowid DESC')
      .all(caseId)
      .map(row => ({
        id: row.id,
        analysisId: row.analysis_id,
        formulaId: row.formula_id,
        shareToken: row.share_token,
        createdAt: row.created_at,
      }));

  const getCase = id => {
    const row = findCase(id);
    if (!row) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    return {
      case: toCase(row),
      analyses: listAnalyses(id),
      formulas: listFormulas(id),
      reports: listReports(id),
    };
  };

  const listCases = () => {
    const rows = db
      .prepare(`
        SELECT c.*,
          a.result_json AS latest_analysis_json,
          a.created_at AS latest_analysis_at,
          f.name AS latest_formula_name,
          f.created_at AS latest_formula_at
        FROM cases c
        LEFT JOIN analyses a ON a.id = (
          SELECT id FROM analyses
          WHERE case_id = c.id AND case_version = c.version
          ORDER BY created_at DESC, rowid DESC LIMIT 1
        )
        LEFT JOIN formulas f ON f.id = (
          SELECT id FROM formulas WHERE case_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1
        )
        WHERE c.deleted_at IS NULL
        ORDER BY c.updated_at DESC
        LIMIT 50
      `)
      .all();
    return rows.map(row => {
      const analysis = parseJson(row.latest_analysis_json, null);
      const primary =
        analysis?.patterns?.find(pattern => pattern.id === analysis.primaryId) ??
        analysis?.patterns?.[0] ??
        null;
      return {
        ...toCase(row),
        latestAnalysis: primary
          ? {
              name: primary.name,
              confidence: primary.confidence,
              createdAt: row.latest_analysis_at,
            }
          : null,
        latestFormula: row.latest_formula_name
          ? { name: row.latest_formula_name, createdAt: row.latest_formula_at }
          : null,
      };
    });
  };

  const createCase = (inputPatient) => {
    const patient = validatePatient(inputPatient);
    const id = randomUUID();
    const timestamp = now();
    db.prepare(`
      INSERT INTO cases(id, alias, age, sex, chief_complaint, inspection, listening, inquiry, palpation, tags_json, lesions_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
    `).run(
      id,
      patient.alias,
      patient.age,
      patient.sex,
      patient.chiefComplaint,
      patient.inspection,
      patient.listening,
      patient.inquiry,
      patient.palpation,
      JSON.stringify(patient.tags),
      timestamp,
      timestamp,
    );
    recordEvent(id, 'case.created');
    return toCase(findCase(id));
  };

  const updateCase = (id, payload) => {
    const existing = findCase(id);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    const version = Number(payload?.version);
    if (!Number.isInteger(version) || version !== existing.version) {
      throw new HttpError(409, 'CASE_VERSION_CONFLICT', '病例已被其他窗口修改，请重新加载。');
    }
    const patient = validatePatient(payload.patient);
    const lesions = Array.isArray(payload.lesions) ? payload.lesions : null;
    const timestamp = now();
    const result = db.prepare(`
      UPDATE cases SET
        alias = ?, age = ?, sex = ?, chief_complaint = ?,
        inspection = ?, listening = ?, inquiry = ?, palpation = ?,
        tags_json = ?, lesions_json = COALESCE(?, lesions_json),
        version = version + 1, updated_at = ?
      WHERE id = ? AND version = ? AND deleted_at IS NULL
    `).run(
      patient.alias,
      patient.age,
      patient.sex,
      patient.chiefComplaint,
      patient.inspection,
      patient.listening,
      patient.inquiry,
      patient.palpation,
      JSON.stringify(patient.tags),
      lesions ? JSON.stringify(lesions) : null,
      timestamp,
      id,
      version,
    );
    if (result.changes === 0) {
      throw new HttpError(409, 'CASE_VERSION_CONFLICT', '病例已被其他窗口修改，请重新加载。');
    }
    recordEvent(id, 'case.updated');
    return toCase(findCase(id));
  };

  const updateLesions = (id, lesions) => {
    const existing = findCase(id);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    db.prepare('UPDATE cases SET lesions_json = ?, updated_at = ?, version = version + 1 WHERE id = ?').run(
      JSON.stringify(Array.isArray(lesions) ? lesions : []),
      now(),
      id,
    );
    recordEvent(id, 'case.lesions_updated', { count: Array.isArray(lesions) ? lesions.length : 0 });
    return toCase(findCase(id));
  };

  const softDeleteCase = id => {
    const existing = findCase(id);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    db.prepare('UPDATE cases SET deleted_at = ?, version = version + 1 WHERE id = ?').run(now(), id);
    recordEvent(id, 'case.deleted');
  };

  const saveAnalysis = (caseId, analysis, meta) => {
    const existing = findCase(caseId);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    const id = randomUUID();
    const timestamp = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        INSERT INTO analyses(id, case_id, provider, model, prompt_version, latency_ms, case_version, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        caseId,
        meta?.provider ?? 'deepseek',
        meta?.model ?? 'deepseek-flash',
        meta?.promptVersion ?? 'unknown',
        Number(meta?.latencyMs) || 0,
        existing.version,
        JSON.stringify(analysis),
        timestamp,
      );
      db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(timestamp, caseId);
      recordEvent(caseId, 'analysis.saved', { analysisId: id, provider: meta?.provider });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return { id, createdAt: timestamp, analysis, meta };
  };

  const saveFormula = (caseId, formula) => {
    const existing = findCase(caseId);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    if (!formula || typeof formula !== 'object') {
      throw new HttpError(400, 'INVALID_FORMULA', '药方数据不完整。');
    }
    const id = randomUUID();
    const timestamp = now();
    const courseDays = [7, 14, 30].includes(Number(formula.courseDays))
      ? Number(formula.courseDays)
      : 14;
    db.prepare(`
      INSERT INTO formulas(id, case_id, name, herbs_json, decoction, course_days, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      caseId,
      String(formula.name ?? '').slice(0, 120),
      JSON.stringify(Array.isArray(formula.herbs) ? formula.herbs.slice(0, 40) : []),
      String(formula.decoction ?? '').slice(0, 500),
      courseDays,
      String(formula.note ?? '').slice(0, 1000),
      timestamp,
    );
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(timestamp, caseId);
    recordEvent(caseId, 'formula.saved', { formulaId: id });
    return {
      id,
      formula: {
        name: String(formula.name ?? ''),
        herbs: Array.isArray(formula.herbs) ? formula.herbs : [],
        decoction: String(formula.decoction ?? ''),
        courseDays,
        note: String(formula.note ?? ''),
      },
      createdAt: timestamp,
    };
  };

  const saveReport = (caseId, payload = {}) => {
    const existing = findCase(caseId);
    if (!existing) throw new HttpError(404, 'CASE_NOT_FOUND', '病例不存在。');
    const analyses = listAnalyses(caseId).filter(item => item.caseVersion === existing.version);
    const formulas = listFormulas(caseId);
    const analysisEntry = payload.analysisId
      ? analyses.find(item => item.id === payload.analysisId) ?? analyses[0]
      : analyses[0];
    const formulaEntry = payload.formulaId
      ? formulas.find(item => item.id === payload.formulaId) ?? formulas[0]
      : formulas[0];
    if (!analysisEntry) {
      throw new HttpError(409, 'REPORT_NEEDS_ANALYSIS', '请先完成一次证型分析再生成报告。');
    }
    const id = randomUUID();
    const shareToken = randomUUID().replaceAll('-', '');
    const timestamp = now();
    const snapshot = {
      case: toCase(findCase(caseId)),
      analysis: analysisEntry.analysis,
      analysisId: analysisEntry.id,
      formula: formulaEntry?.formula ?? null,
      formulaId: formulaEntry?.id ?? null,
      lesions: Array.isArray(payload.lesions)
        ? payload.lesions.slice(0, 10)
        : parseJson(existing.lesions_json, []),
      simulation: Array.isArray(payload.simulation) ? payload.simulation.slice(0, 10) : [],
      generatedAt: timestamp,
      disclaimer:
        '本报告为沟通示意，不是诊断结论，不替代面诊、检查与医生决策。',
    };
    db.prepare(`
      INSERT INTO reports(id, case_id, analysis_id, formula_id, snapshot_json, share_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      caseId,
      analysisEntry.id,
      formulaEntry?.id ?? null,
      JSON.stringify(snapshot),
      shareToken,
      timestamp,
    );
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(timestamp, caseId);
    recordEvent(caseId, 'report.saved', { reportId: id });
    return { id, shareToken, snapshot, createdAt: timestamp };
  };

  const getReport = id => {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!row) throw new HttpError(404, 'REPORT_NOT_FOUND', '报告不存在。');
    return {
      id: row.id,
      caseId: row.case_id,
      analysisId: row.analysis_id,
      formulaId: row.formula_id,
      shareToken: row.share_token,
      snapshot: parseJson(row.snapshot_json, null),
      createdAt: row.created_at,
    };
  };

  const close = () => db.close();

  return {
    db,
    listCases,
    getCase,
    createCase,
    updateCase,
    updateLesions,
    softDeleteCase,
    saveAnalysis,
    listAnalyses,
    saveFormula,
    listFormulas,
    saveReport,
    listReports,
    getReport,
    recordEvent,
    close,
  };
}

let defaultStore = null;

export function getStore() {
  defaultStore ??= createStore();
  return defaultStore;
}
