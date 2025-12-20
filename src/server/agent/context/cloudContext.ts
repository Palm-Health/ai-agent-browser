import { promises as fs } from 'node:fs';
import path from 'node:path';

function mask(value?: string): string {
  if (!value) return 'not set';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

async function readSupabaseMigrations(repoPath: string): Promise<string[]> {
  const migrationsDir = path.join(repoPath, 'supabase', 'migrations');
  try {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function getCloudContextSummary(repoPath?: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gcpProjectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const cloudRunService = process.env.CLOUD_RUN_SERVICE;
  const pubsubTopic = process.env.PUBSUB_TOPIC || process.env.PUBSUB_NOTIFICATIONS_TOPIC;

  const migrations = repoPath ? await readSupabaseMigrations(repoPath) : [];

  const supabaseSummary = `Supabase config: URL=${mask(supabaseUrl)}, anonKey=${mask(
    supabaseAnonKey
  )}, serviceKey=${mask(supabaseServiceKey)}`;
  const gcpSummary = `GCP config: project=${gcpProjectId || 'not set'}, cloud run=${
    cloudRunService || 'n/a'
  }, pubsub topic=${pubsubTopic || 'n/a'}`;
  const migrationSummary = migrations.length
    ? `Found migrations: ${migrations.join(', ')}`
    : 'No migrations found or directory missing.';

  return [supabaseSummary, gcpSummary, migrationSummary].join('\n');
}
