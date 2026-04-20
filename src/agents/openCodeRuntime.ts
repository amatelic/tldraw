export interface OpenCodeRuntimeConfig {
  baseUrl: string;
  directory?: string;
  workspace?: string;
  agent?: string;
  useMockTransport: boolean;
}

interface OpenCodeRuntimeEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_OPENCODE_BASE_URL?: string;
  VITE_OPENCODE_DIRECTORY?: string;
  VITE_OPENCODE_WORKSPACE?: string;
  VITE_OPENCODE_AGENT?: string;
  VITE_OPENCODE_DISABLE_LIVE?: string;
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function shouldUseMockTransport(env: OpenCodeRuntimeEnv): boolean {
  if (env.MODE === 'test') {
    return true;
  }

  return env.VITE_OPENCODE_DISABLE_LIVE === 'true';
}

export function createOpenCodeRuntimeConfig(env: OpenCodeRuntimeEnv = import.meta.env): OpenCodeRuntimeConfig {
  return {
    baseUrl:
      normalizeOptionalValue(env.VITE_OPENCODE_BASE_URL) ?? (env.DEV ? '/api/opencode' : 'http://127.0.0.1:4096'),
    directory: normalizeOptionalValue(env.VITE_OPENCODE_DIRECTORY),
    workspace: normalizeOptionalValue(env.VITE_OPENCODE_WORKSPACE),
    agent: normalizeOptionalValue(env.VITE_OPENCODE_AGENT),
    useMockTransport: shouldUseMockTransport(env),
  };
}
