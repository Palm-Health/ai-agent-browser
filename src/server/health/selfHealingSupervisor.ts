import { HealthIssue, SystemHealthReport } from './healthTypes';
import { diagnoseIssue } from './rootCause';
import { attemptAutoFix } from './autoFixer';
import { rememberIssue } from './healthMemory';

export async function runSelfHealingSupervisor(issues: HealthIssue[]): Promise<SystemHealthReport> {
  const results = await Promise.all(
    issues.map(async (issue) => {
      rememberIssue(issue);
      const diagnosis = diagnoseIssue(issue);
      const fix = await attemptAutoFix(issue);
      return { issue, diagnosis, fix };
    })
  );

  return {
    ok: results.every((result) => result.fix.success),
    issues,
  };
}
