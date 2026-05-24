export function getCwd(explicitCwd?: string): string {
  return explicitCwd ?? process.cwd();
}
