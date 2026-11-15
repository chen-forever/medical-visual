import type {
  AnalysisResult,
  Formula,
  Lesion,
  OrganMeta,
  Patient,
  SimulationPoint,
  StepId,
} from './types';

export const DEMO_PATIENT: Patient = {
  alias: '林女士',
  age: 38,
  sex: 'female',
  chiefComplaint: '反复入睡困难 3 个月，伴日间乏力、食欲不振。',
  inspection: '面色少华，舌质淡胖、边有齿痕，苔薄白。',
  listening: '语声低微，气息偏弱，未闻及异常气味。',
  inquiry: '入睡困难，多梦易醒，醒后难再入睡；日间乏力，食欲差，大便偏溏；近期工作压力较大，情绪易紧张。',
  palpation: '脉细弱，右关尤甚；腹软，无明显压痛。',
  tags: ['入睡困难', '多梦易醒', '乏力', '纳差', '便溏', '焦虑'],
};

export const DEMO_ANALYSIS: AnalysisResult = {
  primaryId: 'heart-spleen',
  generatedAt: '2026-11-15T09:40:00+08:00',
  modelLabel: '中医证候结构化模型 · 演示',
  redFlags: [],
  missingInfo: ['入睡具体时长', '饮食偏嗜', '月经情况'],
  disclaimer: '本结果为沟通示意与证型候选，不构成诊断或治疗建议，需由执业医师确认。',
  patterns: [
    {
      id: 'heart-spleen',
      name: '心脾两虚',
      confidence: 78,
      summary: '心血不足、脾气虚弱并见，心神失养与运化无力相互影响，常见失眠、乏力、纳差、便溏。',
      evidence: ['入睡困难、多梦易醒', '日间乏力、语声低微', '纳差、大便偏溏', '舌淡胖有齿痕、脉细弱'],
      organs: ['心', '脾'],
      meridians: ['手少阴心经', '足太阴脾经'],
      rationale:
        '思虑劳倦伤脾，脾失健运则纳差、便溏、乏力；气血生化不足，心血亏虚，心神失养，故入睡困难、多梦易醒。舌脉与四诊信息相互支持。',
      caution: '需与肝郁化火、痰热内扰等证型鉴别；若出现明显情绪低落或持续加重，应进一步评估。',
    },
    {
      id: 'liver-spleen',
      name: '肝郁脾虚',
      confidence: 56,
      summary: '情志不舒、肝失疏泄，横逆犯脾，可见情绪紧张、纳差、便溏与睡眠不安。',
      evidence: ['工作压力较大、情绪易紧张', '纳差、便溏', '脉细弱'],
      organs: ['肝', '脾'],
      meridians: ['足厥阴肝经', '足太阴脾经'],
      rationale: '情志因素明显，肝郁与脾虚并存；但舌象与失眠特点更支持心血不足，故列为主要鉴别候。',
    },
    {
      id: 'phlegm-damp',
      name: '痰湿内扰',
      confidence: 34,
      summary: '脾虚生湿、湿聚成痰，痰湿扰心可见寐不安、头身困重，需结合苔腻与体型进一步判断。',
      evidence: ['舌淡胖', '大便偏溏', '日间乏力'],
      organs: ['脾', '胃'],
      meridians: ['足太阴脾经', '足阳明胃经'],
      rationale: '存在脾虚湿象，但苔不厚腻、无明显头身困重，痰湿证据尚不充分，暂列低置信候选。',
    },
  ],
};

export const DEMO_FORMULA: Formula = {
  name: '归脾汤加减',
  courseDays: 14,
  decoction: '水煎服，每日 1 剂，分早晚温服。',
  note: '本方为演示病例的医生记录，仅用于展示与沟通，不构成处方建议。',
  herbs: [
    { id: 'h1', name: '黄芪', dose: '15g', role: '益气健脾' },
    { id: 'h2', name: '党参', dose: '12g', role: '补中益气' },
    { id: 'h3', name: '白术', dose: '10g', role: '健脾燥湿' },
    { id: 'h4', name: '当归', dose: '10g', role: '养血和血' },
    { id: 'h5', name: '茯神', dose: '12g', role: '宁心安神' },
    { id: 'h6', name: '酸枣仁', dose: '15g', role: '养心安神' },
    { id: 'h7', name: '远志', dose: '6g', role: '安神益智' },
    { id: 'h8', name: '木香', dose: '6g', role: '理气醒脾' },
    { id: 'h9', name: '炙甘草', dose: '6g', role: '调和诸药' },
  ],
};

export const DEMO_LESIONS: Lesion[] = [
  {
    id: 'l1',
    organId: 'heart',
    label: '心神失养',
    severity: '主要',
    evidence: '入睡困难、多梦易醒；心主神明，心血不足则神不守舍。',
  },
  {
    id: 'l2',
    organId: 'spleen',
    label: '脾失健运',
    severity: '主要',
    evidence: '纳差、便溏、乏力；舌淡胖有齿痕，右关脉弱。',
  },
  {
    id: 'l3',
    organId: 'stomach',
    label: '胃纳不和',
    severity: '次要',
    evidence: '食欲不振、饭后腹胀；与脾虚运化无力相关。',
  },
];

export const SIMULATION: SimulationPoint[] = [
  {
    day: 0,
    label: '当前',
    score: 38,
    sleep: 34,
    appetite: 38,
    energy: 31,
    damp: 62,
    note: '基线：入睡困难、纳差、乏力明显，湿象偏重。',
  },
  {
    day: 7,
    label: '第 7 天',
    score: 48,
    sleep: 45,
    appetite: 46,
    energy: 42,
    damp: 56,
    note: '模拟假设：药后胃纳先改善，入睡时间略缩短，日间乏力仍存。',
  },
  {
    day: 14,
    label: '第 14 天',
    score: 61,
    sleep: 58,
    appetite: 57,
    energy: 54,
    damp: 47,
    note: '模拟假设：脾气渐复，湿象减轻；睡眠质量改善但仍有易醒。',
  },
  {
    day: 30,
    label: '第 30 天',
    score: 74,
    sleep: 70,
    appetite: 68,
    energy: 66,
    damp: 38,
    note: '模拟假设：气血渐充，睡眠与精力趋稳；仍需巩固作息与情绪管理。',
  },
];

export const ORGAN_META: OrganMeta[] = [
  {
    id: 'heart',
    label: '心',
    system: 'cardiac',
    color: '#c4473f',
    meridian: '手少阴心经',
    tcmOrgan: '心主血脉、主神明',
    description: '心推动血液运行，又与精神意识活动相关。本案中心血不足、心神失养，是失眠的核心病位之一。',
    concepts: ['heart'],
  },
  {
    id: 'lung',
    label: '肺',
    system: 'respiratory',
    color: '#d79aa3',
    meridian: '手太阴肺经',
    tcmOrgan: '肺主气、司呼吸',
    description: '肺主一身之气，参与气的生成与宣发肃降。气虚时可见语声低微、气息偏弱。',
    concepts: ['right lung', 'left lung'],
  },
  {
    id: 'liver',
    label: '肝',
    system: 'digestive',
    color: '#8a553a',
    meridian: '足厥阴肝经',
    tcmOrgan: '肝主疏泄、藏血',
    description: '肝调畅气机与情志。工作压力与情绪紧张时，肝郁可横逆犯脾，影响睡眠与食欲。',
    concepts: ['liver'],
  },
  {
    id: 'spleen',
    label: '脾',
    system: 'lymphatic',
    color: '#8a6f9e',
    meridian: '足太阴脾经',
    tcmOrgan: '脾主运化、统血',
    description: '脾把水谷转化为气血。脾虚则纳差、便溏、乏力，气血生化不足又会加重心血亏虚。',
    concepts: ['spleen'],
  },
  {
    id: 'stomach',
    label: '胃',
    system: 'digestive',
    color: '#c99a5d',
    meridian: '足阳明胃经',
    tcmOrgan: '胃主受纳、腐熟',
    description: '胃接受并初步消化食物。胃纳不和可见食欲不振、饭后腹胀，常与脾虚并见。',
    concepts: ['stomach'],
  },
  {
    id: 'kidney',
    label: '肾',
    system: 'urinary',
    color: '#a65a5a',
    meridian: '足少阴肾经',
    tcmOrgan: '肾藏精、主水',
    description: '肾藏精，为先天之本。长期劳倦可累及肾精，但本案肾虚证据不突出，暂列观察。',
    concepts: ['right kidney', 'left kidney'],
  },
  {
    id: 'brain',
    label: '脑',
    system: 'nervous',
    color: '#d8bd8a',
    meridian: '督脉',
    tcmOrgan: '脑为元神之府',
    description: '脑与神志活动相关。中医常以心主神明统摄，脑为元神之府，二者在失眠解释中相互参照。',
    concepts: ['brain'],
  },
  {
    id: 'gallbladder',
    label: '胆',
    system: 'digestive',
    color: '#6f8f5a',
    meridian: '足少阳胆经',
    tcmOrgan: '胆主决断',
    description: '胆与情志决断、睡眠相关。本案无明显胆郁痰扰证据，作为鉴别观察。',
    concepts: ['gallbladder'],
  },
];

export const ORGAN_BY_ID = Object.fromEntries(ORGAN_META.map(o => [o.id, o]));

export const STEPS: Array<{
  id: StepId;
  no: string;
  label: string;
  short: string;
  group: '采集' | '分析' | '呈现' | '输出';
}> = [
  { id: 'home', no: '00', label: '工作台', short: '首页', group: '采集' },
  { id: 'patient', no: '01', label: '患者信息', short: '四诊采集', group: '采集' },
  { id: 'analysis', no: '02', label: '症状分析', short: '证型候选', group: '分析' },
  { id: 'body', no: '03', label: '数字人体', short: '人体总览', group: '呈现' },
  { id: 'inside', no: '04', label: '内部观察', short: '器官与剖面', group: '呈现' },
  { id: 'lesion', no: '05', label: '病位定位', short: '病位标记', group: '呈现' },
  { id: 'state', no: '06', label: '当前状态', short: '气机与病机', group: '呈现' },
  { id: 'formula', no: '07', label: '输入药方', short: '方案记录', group: '输出' },
  { id: 'timeline', no: '08', label: '时间模拟', short: '7/14/30 天', group: '输出' },
  { id: 'report', no: '09', label: '患者报告', short: '沟通版报告', group: '输出' },
];
