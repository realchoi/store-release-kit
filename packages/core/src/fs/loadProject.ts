import fs from 'fs-extra';
import { parse } from 'yaml';
import { basename, join } from 'node:path';
import { StoreReleaseKitError, formatZodError } from '../utils/errors.js';
import { ProjectConfigSchema, type ProjectConfig } from '../schema/app.js';
import { GlossarySchema, type Glossary } from '../schema/glossary.js';
import { LocaleMetadataSchema, type LocaleMetadata } from '../schema/locale.js';
import { ReleaseBaseSchema, ReleaseProjectSchema, type ReleaseProject } from '../schema/release.js';

async function readYamlFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parse(content) as T;
  } catch (error) {
    throw new StoreReleaseKitError(
      `Failed to read YAML file: ${filePath}`,
      'YAML_READ_FAILED',
      error,
    );
  }
}

export async function loadProjectConfig(projectDir: string): Promise<ProjectConfig> {
  const filePath = join(projectDir, 'store-release.config.yml');
  const parsed = await readYamlFile<unknown>(filePath);
  const result = ProjectConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new StoreReleaseKitError(
      `Invalid project config:\n${formatZodError(result.error)}`,
      'PROJECT_CONFIG_INVALID',
      result.error,
    );
  }

  return result.data;
}

export async function loadGlossary(projectDir: string): Promise<Glossary | undefined> {
  const filePath = join(projectDir, 'glossary.yml');

  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  const parsed = await readYamlFile<unknown>(filePath);
  const result = GlossarySchema.safeParse(parsed);

  if (!result.success) {
    throw new StoreReleaseKitError(
      `Invalid glossary:\n${formatZodError(result.error)}`,
      'GLOSSARY_INVALID',
      result.error,
    );
  }

  return result.data;
}

export async function loadReleaseProject(
  projectDir: string,
  version: string,
): Promise<ReleaseProject> {
  const config = await loadProjectConfig(projectDir);
  const glossary = await loadGlossary(projectDir);
  const releaseDir = join(projectDir, 'releases', version);
  const base = ReleaseBaseSchema.safeParse(
    await readYamlFile<unknown>(join(releaseDir, 'base.yml')),
  );

  if (!base.success) {
    throw new StoreReleaseKitError(
      `Invalid release base:\n${formatZodError(base.error)}`,
      'RELEASE_BASE_INVALID',
      base.error,
    );
  }

  const localesDir = join(releaseDir, 'locales');
  const localeFiles = (await fs.pathExists(localesDir))
    ? (await fs.readdir(localesDir)).filter(
        (file) => file.endsWith('.yml') || file.endsWith('.yaml'),
      )
    : [];
  const locales: Record<string, LocaleMetadata> = {};

  for (const file of localeFiles.sort()) {
    const parsed = await readYamlFile<unknown>(join(localesDir, file));
    const result = LocaleMetadataSchema.safeParse(parsed);

    if (!result.success) {
      throw new StoreReleaseKitError(
        `Invalid locale metadata ${file}:\n${formatZodError(result.error)}`,
        'LOCALE_METADATA_INVALID',
        result.error,
      );
    }

    locales[basename(file).replace(/\.ya?ml$/, '')] = result.data;
  }

  const projectResult = ReleaseProjectSchema.safeParse({
    config,
    base: base.data,
    locales,
    glossary,
  });

  if (!projectResult.success) {
    throw new StoreReleaseKitError(
      `Invalid release project:\n${formatZodError(projectResult.error)}`,
      'RELEASE_PROJECT_INVALID',
      projectResult.error,
    );
  }

  return projectResult.data;
}
