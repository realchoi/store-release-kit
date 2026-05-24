import fs from 'fs-extra';
import { stringify } from 'yaml';
import { dirname, join } from 'node:path';
import type { Glossary } from '../schema/glossary.js';
import type { LocaleMetadata } from '../schema/locale.js';
import type { ProjectConfig } from '../schema/app.js';
import type { ReleaseBase } from '../schema/release.js';

export async function writeYamlFile(filePath: string, value: unknown): Promise<void> {
  await fs.ensureDir(dirname(filePath));
  await fs.writeFile(filePath, stringify(value), 'utf8');
}

export async function writeProjectConfig(projectDir: string, config: ProjectConfig): Promise<void> {
  await writeYamlFile(join(projectDir, 'store-release.config.yml'), config);
}

export async function writeGlossary(projectDir: string, glossary: Glossary): Promise<void> {
  await writeYamlFile(join(projectDir, 'glossary.yml'), glossary);
}

export async function writeReleaseBase(
  projectDir: string,
  version: string,
  base: ReleaseBase,
): Promise<void> {
  await writeYamlFile(join(projectDir, 'releases', version, 'base.yml'), base);
}

export async function writeLocaleMetadata(
  projectDir: string,
  version: string,
  locale: LocaleMetadata,
): Promise<void> {
  await writeYamlFile(
    join(projectDir, 'releases', version, 'locales', `${locale.locale}.yml`),
    locale,
  );
}
