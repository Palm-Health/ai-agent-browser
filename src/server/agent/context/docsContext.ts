const docsCatalog: { keywords: string[]; snippet: string }[] = [
  {
    keywords: ['next', 'app router', 'route'],
    snippet:
      'Next.js App Router: API routes live under app/api/*/route.ts with Request/Response handlers. Use edge-safe APIs and export runtime = "nodejs" when accessing Node features.',
  },
  {
    keywords: ['supabase', 'rls', 'schema'],
    snippet:
      'Supabase: use the project service role key for server-side calls. Migrations live in supabase/migrations with SQL defining tables, RLS policies, and seeds.',
  },
  {
    keywords: ['langgraph', 'langchain', 'agent'],
    snippet:
      'LangGraph/LangChain: prefer small graphs orchestrating tools. Keep tool descriptions concise and deterministic; stream updates when running long tasks.',
  },
  {
    keywords: ['fhir', 'medicationrequest', 'observation'],
    snippet:
      'FHIR: MedicationRequest resources include medication, dosageInstruction, requester, and intent. Observation resources capture vital signs or labs with subject, performer, and valueQuantity.',
  },
  {
    keywords: ['youtube', 'metrics', 'marketing'],
    snippet:
      'YouTube metrics: gather viewCount, likeCount, impressionCount, and watchTime for reporting. Use incremental sync jobs to avoid quota spikes.',
  },
];

export async function getDocsContextForTask(task: string): Promise<string> {
  if (!task) return '';
  const normalized = task.toLowerCase();
  const matched = docsCatalog.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword))
  );
  if (!matched.length) return '';
  return `Relevant docs snippets:\n${matched.map((m) => `- ${m.snippet}`).join('\n')}`;
}
