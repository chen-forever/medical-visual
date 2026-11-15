const RULES = [
  {
    id: 'chest',
    label: '胸痛 / 疑似心血管急症',
    pattern: /胸痛|胸闷压榨|压榨性胸痛|心前区疼痛|大汗淋漓|放射痛/,
  },
  {
    id: 'consciousness',
    label: '意识障碍 / 晕厥 / 抽搐',
    pattern: /意识不清|意识障碍|昏迷|晕厥|昏倒|抽搐|惊厥/,
  },
  {
    id: 'stroke',
    label: '疑似脑卒中',
    pattern: /偏瘫|半身不遂|口角歪斜|言语不清|说话不清|一侧肢体无力|肢体麻木/,
  },
  {
    id: 'bleeding',
    label: '出血风险',
    pattern: /大出血|呕血|吐血|黑便|便血|血崩|大量阴道出血/,
  },
  {
    id: 'breathing',
    label: '高热 / 呼吸困难',
    pattern: /高热不退|持续高热|呼吸困难|喘促|气促|发绀|口唇紫绀/,
  },
  {
    id: 'abdomen',
    label: '急腹症表现',
    pattern: /剧烈腹痛|腹肌紧张|板状腹|急腹症/,
  },
  {
    id: 'pregnancy',
    label: '孕产相关急症',
    pattern: /(孕|妊娠|产后).{0,12}(出血|腹痛|抽搐|昏迷)/,
  },
];

export function detectRedFlags(patient) {
  const text = [
    patient?.chiefComplaint,
    patient?.inspection,
    patient?.listening,
    patient?.inquiry,
    patient?.palpation,
    ...(patient?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  const hits = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) hits.push(rule.label);
  }
  return [...new Set(hits)];
}
