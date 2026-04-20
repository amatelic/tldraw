import type { OpenCodeDiagramResponse, OpenCodeRequest, OpenCodeTransport } from './openCodeClient';
import { OpenCodeTransportUnavailableError } from './openCodeClient';

export interface OpenCodeHttpTransportOptions {
  baseUrl: string;
  directory?: string;
  workspace?: string;
  agent?: string;
  fetchImpl?: typeof fetch;
}

interface OpenCodeSessionResponse {
  id: string;
}

interface OpenCodeAssistantMessageResponse {
  info?: {
    structured?: unknown;
  };
  parts?: Array<{
    type?: string;
    text?: string;
  }>;
}

const MAX_CONTEXT_SHAPES = 12;

const OPEN_CODE_DIAGRAM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['workflow', 'summary', 'shapes', 'presentationBrief'],
  properties: {
    workflow: {
      type: 'string',
      enum: ['generate-diagram'],
    },
    summary: {
      type: 'string',
      minLength: 1,
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'summary', 'shapeIds'],
        properties: {
          id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          summary: { type: 'string', minLength: 1 },
          shapeIds: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    shapes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'bounds'],
        properties: {
          id: { type: 'string', minLength: 1 },
          type: {
            type: 'string',
            enum: ['rectangle', 'circle', 'text'],
          },
          bounds: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y', 'width', 'height'],
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number', minimum: 0 },
              height: { type: 'number', minimum: 0 },
            },
          },
          style: {
            type: 'object',
          },
          text: { type: 'string' },
        },
      },
    },
    connectors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'start', 'end'],
        properties: {
          id: { type: 'string', minLength: 1 },
          type: {
            type: 'string',
            enum: ['arrow', 'line'],
          },
          sourceId: { type: 'string' },
          targetId: { type: 'string' },
          start: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y'],
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
          },
          end: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y'],
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
          },
          style: {
            type: 'object',
          },
          label: {
            type: ['string', 'null'],
          },
        },
      },
    },
    presentationBrief: {
      type: 'object',
      additionalProperties: false,
      required: [
        'title',
        'objective',
        'audience',
        'summary',
        'narrativeSteps',
        'speakerNotes',
        'assumptions',
        'openQuestions',
      ],
      properties: {
        title: { type: 'string', minLength: 1 },
        objective: { type: 'string', minLength: 1 },
        audience: { type: 'string', minLength: 1 },
        summary: { type: 'string', minLength: 1 },
        narrativeSteps: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
        speakerNotes: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
        assumptions: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
        openQuestions: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
      },
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severity', 'message'],
        properties: {
          id: { type: 'string', minLength: 1 },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          message: { type: 'string', minLength: 1 },
        },
      },
    },
  },
} as const;

const OPEN_CODE_SYSTEM_PROMPT = [
  'You generate simple work-diagram proposals for a canvas application.',
  'Return only structured output that satisfies the provided JSON schema.',
  'Do not include markdown, code fences, or commentary outside the schema.',
  'Keep diagrams simple, readable, and presentation-friendly.',
  'Use only rectangle, circle, or text shapes, plus line or arrow connectors.',
  'Prefer left-to-right or top-to-bottom layouts with clear, short labels.',
  'Respect existing board context when it is relevant, but do not mention file edits or coding tasks.',
].join('\n');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function buildShapeLine(shape: OpenCodeRequest['context']['shapes'][number]): string {
  const label = shape.text?.trim() ? ` "${shape.text.trim()}"` : '';
  const { x, y, width, height } = shape.bounds;
  return `- ${shape.type}${label} at (${x}, ${y}) size ${width}x${height}`;
}

function buildPrompt(request: OpenCodeRequest): string {
  const { context } = request;
  const lines = [
    `User request: ${request.prompt.trim() || 'Create a simple work diagram.'}`,
    `Workspace: ${context.workspaceName} (${context.workspaceId})`,
    `Scope: ${context.scope}`,
    `Viewport: ${context.viewport ? `${context.viewport.width}x${context.viewport.height}` : 'unknown'}`,
    `Camera: x=${context.camera.x}, y=${context.camera.y}, zoom=${context.camera.zoom}`,
    `Selected shapes: ${context.selectedShapeIds.length > 0 ? context.selectedShapeIds.join(', ') : 'none'}`,
    `Current board shape count: ${context.shapeCount}`,
  ];

  if (context.shapes.length > 0) {
    lines.push('Board context:');
    lines.push(...context.shapes.slice(0, MAX_CONTEXT_SHAPES).map(buildShapeLine));
  }

  if (context.shapes.length > MAX_CONTEXT_SHAPES) {
    lines.push(`- ${context.shapes.length - MAX_CONTEXT_SHAPES} additional shapes omitted for brevity`);
  }

  lines.push(
    'Response requirements:',
    '- Provide a concise summary of the draft.',
    '- Group related nodes into sections when helpful.',
    '- Include a presentation brief the user can immediately speak from.',
    '- Add warnings when the draft is simplified or low confidence.'
  );

  return lines.join('\n');
}

function buildAbsoluteUrl(baseUrl: string, path: string): URL {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedBaseUrl.startsWith('http://') || normalizedBaseUrl.startsWith('https://')) {
    return new URL(`${normalizedBaseUrl}${normalizedPath}`);
  }

  const origin = globalThis.location?.origin ?? 'http://localhost';
  return new URL(`${normalizedBaseUrl}${normalizedPath}`, origin);
}

function createSessionTitle(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return 'Diagram generation request';
  }

  if (trimmed.length <= 56) {
    return `Diagram: ${trimmed}`;
  }

  return `Diagram: ${trimmed.slice(0, 53).trimEnd()}...`;
}

function parseStructuredPayload(payload: unknown): OpenCodeDiagramResponse {
  if (isRecord(payload)) {
    return payload as unknown as OpenCodeDiagramResponse;
  }

  if (typeof payload === 'string') {
    return JSON.parse(stripCodeFences(payload)) as OpenCodeDiagramResponse;
  }

  throw new Error('OpenCode did not return a structured diagram payload.');
}

function extractDiagramResponse(message: OpenCodeAssistantMessageResponse): OpenCodeDiagramResponse {
  if (message.info?.structured !== undefined) {
    return parseStructuredPayload(message.info.structured);
  }

  const textPart = message.parts?.find(
    (part) => part.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0
  );

  if (!textPart?.text) {
    throw new Error('OpenCode did not return structured data or a text payload.');
  }

  return parseStructuredPayload(textPart.text);
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export class OpenCodeHttpTransport implements OpenCodeTransport {
  private readonly baseUrl: string;
  private readonly directory?: string;
  private readonly workspace?: string;
  private readonly agent?: string;
  private readonly fetchImpl: typeof fetch;

  public constructor({
    baseUrl,
    directory,
    workspace,
    agent,
    fetchImpl = fetch,
  }: OpenCodeHttpTransportOptions) {
    this.baseUrl = baseUrl;
    this.directory = directory;
    this.workspace = workspace;
    this.agent = agent;
    this.fetchImpl = fetchImpl;
  }

  public async send(request: OpenCodeRequest): Promise<OpenCodeDiagramResponse> {
    const session = await this.requestJson<OpenCodeSessionResponse>('/session', {
      method: 'POST',
      body: JSON.stringify({
        title: createSessionTitle(request.prompt),
      }),
    });

    try {
      const message = await this.requestJson<OpenCodeAssistantMessageResponse>(
        `/session/${session.id}/message`,
        {
          method: 'POST',
          body: JSON.stringify({
            agent: this.agent,
            system: OPEN_CODE_SYSTEM_PROMPT,
            format: {
              type: 'json_schema',
              schema: OPEN_CODE_DIAGRAM_SCHEMA,
              retryCount: 1,
            },
            parts: [
              {
                type: 'text',
                text: buildPrompt(request),
              },
            ],
          }),
        }
      );

      return extractDiagramResponse(message);
    } finally {
      await this.deleteSession(session.id);
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.requestJson<unknown>(`/session/${sessionId}`, {
        method: 'DELETE',
      });
    } catch {
      // Cleanup should never mask the primary request result.
    }
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const url = buildAbsoluteUrl(this.baseUrl, path);

    if (this.directory) {
      url.searchParams.set('directory', this.directory);
    }

    if (this.workspace) {
      url.searchParams.set('workspace', this.workspace);
    }

    let response: Response;
    try {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');

      response = await this.fetchImpl(url.toString(), {
        ...init,
        headers,
      });
    } catch (error) {
      throw new OpenCodeTransportUnavailableError('OpenCode server is unavailable.', { cause: error });
    }

    if (!response.ok) {
      const body = await readResponseText(response);
      if (response.status >= 500) {
        throw new OpenCodeTransportUnavailableError(
          `OpenCode server responded with ${response.status} ${response.statusText}.`,
          { cause: body || undefined }
        );
      }

      throw new Error(
        `OpenCode request failed with ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const responseText = await readResponseText(response);
    if (!responseText) {
      return undefined as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch {
      throw new Error(`OpenCode returned invalid JSON for ${path}.`);
    }
  }
}
