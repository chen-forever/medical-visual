import type { SystemId } from './atlas';

export const SYSTEM_LABELS: Record<SystemId, string> = {
  skeletal: '骨骼',
  muscular: '肌肉',
  cardiac: '心',
  sensory: '感官',
  arterial: '动脉',
  venous: '静脉',
  nervous: '神经',
  respiratory: '肺',
  digestive: '脾胃',
  urinary: '肾与膀胱',
  lymphatic: '脾与淋巴',
  endocrine: '内分泌',
  reproductive: '生殖',
  integumentary: '体表',
  connective: '结缔组织',
};

export const LAYER_GROUPS: Array<{ id: SystemId; label: string; note: string }> = [
  { id: 'integumentary', label: '体表', note: '半透明外壳' },
  { id: 'skeletal', label: '骨骼', note: '骨架与保护' },
  { id: 'cardiac', label: '心', note: '心主血脉' },
  { id: 'respiratory', label: '肺', note: '肺主气' },
  { id: 'digestive', label: '脾胃', note: '受纳运化' },
  { id: 'urinary', label: '肾与膀胱', note: '主水藏精' },
  { id: 'lymphatic', label: '脾与淋巴', note: '运化统血' },
  { id: 'nervous', label: '神经', note: '元神之府' },
  { id: 'arterial', label: '动脉', note: '血脉运行' },
  { id: 'venous', label: '静脉', note: '回流' },
  { id: 'endocrine', label: '内分泌', note: '激素调节' },
  { id: 'muscular', label: '肌肉', note: '默认隐藏' },
];
