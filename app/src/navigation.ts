import type { StepId } from './types';

export function go(step: StepId) {
  window.location.hash = `/${step}`;
}
