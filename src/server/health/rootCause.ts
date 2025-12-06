import { HealthIssue } from './healthTypes';

export function diagnoseIssue(issue: HealthIssue): string {
  return `Root cause for ${issue.id}: heuristic analysis`;
}
