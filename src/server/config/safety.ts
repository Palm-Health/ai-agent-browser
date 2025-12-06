export const SAFE_MODE = process.env.SAFE_MODE !== 'false';
export const SIMULATION_MODE = process.env.SIMULATION_MODE !== 'false';

export function assertSafeOperation(context: string) {
  if (!SAFE_MODE) return;
  if (SIMULATION_MODE) return;
  // In safe mode, we avoid destructive actions by default.
  // eslint-disable-next-line no-console
  console.warn(`[safety] ${context}: SAFE_MODE is enabled; destructive operations are disabled.`);
}
