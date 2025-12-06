import { HealthIssue } from './healthTypes';

export async function retest(issue: HealthIssue): Promise<boolean> {
  return issue.severity !== 'high';
}
