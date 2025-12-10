import { spawnSync } from 'node:child_process';

const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf-8' });

if (result.error) {
  console.error('ffmpeg check failed:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error('ffmpeg exited with status', result.status, result.stderr);
  process.exit(result.status || 1);
}

console.log('ffmpeg available:', (result.stdout || '').split('\n')[0] || 'version detected');
process.exit(0);
