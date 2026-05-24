import 'dotenv/config';
import { DeepLTranslator } from './providers/deepl.js';
import { OpenAITranslator } from './providers/openai.js';
import type { TranslateReleaseInput, TranslatorProviderName } from './types.js';

type LiveSmokeProviderName = Extract<TranslatorProviderName, 'openai' | 'deepl'>;

export interface LiveSmokeOptions {
  env?: Partial<NodeJS.ProcessEnv>;
  provider?: LiveSmokeProviderName;
}

export interface LiveSmokeResult {
  provider: LiveSmokeProviderName;
  reason?: string;
  status: 'passed' | 'skipped';
}

const SMOKE_INPUT: TranslateReleaseInput = {
  sourceLocale: 'zh-Hans',
  targetLocales: ['en-US'],
  source: {
    locale: 'zh-Hans',
    name: '番茄计划',
    subtitle: '专注',
    description: '番茄计划帮助你保持专注。',
    whatsNew: '优化了统计页面。',
  },
};

function parseLiveSmokeProvider(value: string | undefined): LiveSmokeProviderName {
  if (value === undefined || value === 'openai' || value === 'deepl') {
    return value ?? 'openai';
  }

  throw new Error(
    `Unsupported translator live smoke provider "${value}". Expected one of: openai, deepl.`,
  );
}

function getProvider(env: Partial<NodeJS.ProcessEnv>, provider: LiveSmokeProviderName) {
  if (provider === 'openai') {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return { reason: 'OPENAI_API_KEY is not set.' };
    }

    return {
      translator: new OpenAITranslator({
        apiKey,
        ...(env.OPENAI_MODEL ? { model: env.OPENAI_MODEL } : {}),
      }),
    };
  }

  const apiKey = env.DEEPL_API_KEY;
  if (!apiKey) {
    return { reason: 'DEEPL_API_KEY is not set.' };
  }

  return {
    translator: new DeepLTranslator({
      apiKey,
      ...(env.DEEPL_API_URL ? { apiUrl: env.DEEPL_API_URL } : {}),
    }),
  };
}

export async function runTranslatorLiveSmoke(
  options: LiveSmokeOptions = {},
): Promise<LiveSmokeResult> {
  const env = options.env ?? process.env;
  const provider = parseLiveSmokeProvider(options.provider ?? env.STORE_RELEASE_TRANSLATOR_PROVIDER);
  const providerResult = getProvider(env, provider);

  if ('reason' in providerResult) {
    return {
      provider,
      reason: providerResult.reason,
      status: 'skipped',
    };
  }

  await providerResult.translator.translateRelease(SMOKE_INPUT);

  return {
    provider,
    status: 'passed',
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTranslatorLiveSmoke();
  console.log(JSON.stringify(result, null, 2));
}
