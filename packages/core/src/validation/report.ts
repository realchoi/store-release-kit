import type { ValidationIssue, ValidationResult } from './rules.js';

function formatIssue(issue: ValidationIssue): string {
  const locale = issue.locale ? `[${issue.locale}] ` : '';
  const path = issue.path ? ` at ${issue.path}` : '';

  return `- ${locale}${issue.code}${path}: ${issue.message}`;
}

function formatIssueGroup(title: string, issues: ValidationIssue[]): string[] {
  if (issues.length === 0) {
    return [];
  }

  return [title, ...issues.map(formatIssue)];
}

export function formatValidationReport(result: ValidationResult): string {
  const status = result.ok ? 'Validation passed' : 'Validation failed';
  const lines = [
    `${status}: ${result.errors.length} error(s), ${result.warnings.length} warning(s).`,
  ];
  const errors = formatIssueGroup('Errors:', result.errors);
  const warnings = formatIssueGroup('Warnings:', result.warnings);

  if (errors.length > 0) {
    lines.push('', ...errors);
  }

  if (warnings.length > 0) {
    lines.push('', ...warnings);
  }

  return lines.join('\n');
}
