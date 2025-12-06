export interface HealthIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

export interface SystemHealthReport {
  ok: boolean;
  issues: HealthIssue[];
}
