import { HealthIssue } from './healthTypes';

const memory: HealthIssue[] = [];

export function rememberIssue(issue: HealthIssue) {
  memory.push(issue);
}

export function listIssues(): HealthIssue[] {
  return memory;
}
