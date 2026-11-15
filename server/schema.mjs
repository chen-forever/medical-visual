export const ORGAN_WHITELIST = [
  '心',
  '肺',
  '肝',
  '脾',
  '肾',
  '胃',
  '胆',
  '小肠',
  '大肠',
  '膀胱',
];

export const DISCLAIMER =
  '本结果为基于中医证候模型的结构化沟通示意，不是诊断结论，不替代面诊、检查与医生决策。';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringList(value, maxItems = 8, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function validatePatient(payload) {
  const raw = payload?.patient ?? payload;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpError(400, 'INVALID_PATIENT', '请求中缺少患者四诊信息。');
  }
  const alias = text(raw.alias, 60);
  const chiefComplaint = text(raw.chiefComplaint, 2000);
  if (!alias) throw new HttpError(400, 'INVALID_PATIENT', '缺少患者称呼。');
  if (!chiefComplaint) {
    throw new HttpError(400, 'INVALID_PATIENT', '缺少主诉。');
  }
  const ageValue = raw.age;
  const age =
    typeof ageValue === 'number'
      ? Math.max(0, Math.min(120, Math.round(ageValue)))
      : ageValue === '' || ageValue == null
        ? null
        : null;
  const sex = ['female', 'male', 'other'].includes(raw.sex) ? raw.sex : 'other';
  return {
    alias,
    age,
    sex,
    chiefComplaint,
    inspection: text(raw.inspection),
    listening: text(raw.listening),
    inquiry: text(raw.inquiry),
    palpation: text(raw.palpation),
    tags: stringList(raw.tags, 20, 40),
  };
}

export function extractJson(content) {
  const raw = text(content, 12000);
  if (!raw) {
    throw new HttpError(502, 'EMPTY_JSON', '模型返回了空内容。');
  }
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new HttpError(502, 'INVALID_JSON', '模型没有返回 JSON 对象。');
  }
  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    throw new HttpError(502, 'INVALID_JSON', '模型返回的 JSON 无法解析。');
  }
}

export function makeBlockedAnalysis(redFlags, modelLabel) {
  return {
    patterns: [],
    primaryId: '',
    redFlags,
    missingInfo: [],
    generatedAt: new Date().toISOString(),
    modelLabel,
    disclaimer:
      '红旗规则已命中。请先处理可能的急症并尽快就医；本系统不会在此情况下继续生成证型或人体模拟。',
  };
}

export function normalizeAnalysis(input, { modelLabel, promptVersion }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(502, 'INVALID_ANALYSIS', '模型返回的结构不是对象。');
  }
  const patterns = [];
  const rawPatterns = Array.isArray(input.patterns) ? input.patterns : [];
  for (const [index, raw] of rawPatterns.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const name = text(raw.name, 60);
    if (!name) continue;
    const allowedOrgans = stringList(raw.organs, 8, 20).filter(organ =>
      ORGAN_WHITELIST.includes(organ),
    );
    const confidenceNumber = Number(raw.confidence);
    const confidence = Number.isFinite(confidenceNumber)
      ? Math.max(0, Math.min(100, Math.round(confidenceNumber)))
      : 0;
    patterns.push({
      id: text(raw.id, 60) || `pattern-${index + 1}`,
      name,
      confidence,
      summary: text(raw.summary, 600),
      evidence: stringList(raw.evidence, 6, 240),
      organs: allowedOrgans,
      meridians: stringList(raw.meridians, 4, 80),
      rationale: text(raw.rationale, 800),
      ...(text(raw.caution, 500) ? { caution: text(raw.caution, 500) } : {}),
    });
    if (patterns.length >= 3) break;
  }

  const redFlags = stringList(input.redFlags, 8, 160);
  if (!patterns.length && !redFlags.length) {
    throw new HttpError(502, 'INVALID_ANALYSIS', '模型没有给出可用的证型候选。');
  }

  const ids = new Set(patterns.map(pattern => pattern.id));
  const primaryId = ids.has(text(input.primaryId, 60))
    ? text(input.primaryId, 60)
    : patterns[0]?.id ?? '';

  return {
    patterns,
    primaryId,
    redFlags,
    missingInfo: stringList(input.missingInfo, 8, 120),
    generatedAt: new Date().toISOString(),
    modelLabel,
    disclaimer: DISCLAIMER,
  };
}
