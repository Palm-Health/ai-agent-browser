export function suggestSelectors(target: string): string[] {
  return [target, `${target}-shadow`, `${target}-aria`].filter(Boolean);
}
