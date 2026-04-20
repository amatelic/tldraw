import { describe, expect, it, vi } from 'vitest';
import { OpenCodeTransportUnavailableError } from './openCodeClient';
import { OpenCodeHttpTransport } from './openCodeHttpTransport';
import { buildAgentRequest } from './agentOrchestrator';
import type { Shape } from '../types';

const shapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  fillStyle: 'none' as const,
  opacity: 1,
  blendMode: 'source-over' as const,
  shadows: [],
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textAlign: 'left' as const,
};

const baseShapes: Shape[] = [
  {
    id: 'shape-a',
    type: 'rectangle',
    bounds: { x: 10, y: 20, width: 140, height: 80 },
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-b',
    type: 'text',
    bounds: { x: 20, y: 130, width: 220, height: 32 },
    text: 'Existing note',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  },
];

function buildGenerateDiagramRequest(prompt: string) {
  return buildAgentRequest({
    workflow: 'generate-diagram',
    prompt,
    scope: 'full-board',
    workspace: { id: 'workspace-1', name: 'Workspace 1' },
    shapes: baseShapes,
    editorState: {
      camera: { x: 0, y: 0, zoom: 1 },
      selectedShapeIds: [],
    },
    viewport: { width: 1200, height: 800 },
  });
}

describe('OpenCodeHttpTransport', () => {
  it('should create a session, prompt OpenCode, and parse the structured response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'session-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            info: {
              structured: {
                workflow: 'generate-diagram',
                summary: 'Drafted a live server diagram.',
                confidence: 'high',
                sections: [],
                shapes: [
                  {
                    id: 'generated-shape',
                    type: 'rectangle',
                    bounds: { x: 100, y: 120, width: 200, height: 80 },
                    text: 'Live node',
                  },
                ],
                connectors: [],
                presentationBrief: {
                  title: 'Live Diagram',
                  objective: 'Explain the system.',
                  audience: 'Engineering',
                  summary: 'Walk through the architecture.',
                  narrativeSteps: ['Start with the first service.'],
                  speakerNotes: ['Keep it high level.'],
                  assumptions: ['This is a simplified draft.'],
                  openQuestions: ['Which service needs more detail?'],
                },
                warnings: [],
              },
            },
            parts: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const transport = new OpenCodeHttpTransport({
      baseUrl: 'http://127.0.0.1:4096',
      directory: '/tmp/project',
      workspace: 'workspace-123',
      agent: 'diagram',
      fetchImpl,
    });

    const response = await transport.send(
      buildGenerateDiagramRequest('Create a backend architecture for a messaging app.')
    );

    expect(response.summary).toContain('live server diagram');
    expect(response.presentationBrief.title).toBe('Live Diagram');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'http://127.0.0.1:4096/session?directory=%2Ftmp%2Fproject&workspace=workspace-123'
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:4096/session/session-1/message?directory=%2Ftmp%2Fproject&workspace=workspace-123'
    );

    const promptBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as {
      format: { type: string };
      parts: Array<{ type: string; text: string }>;
      system: string;
      agent?: string;
    };

    expect(promptBody.agent).toBe('diagram');
    expect(promptBody.system).toContain('Return only structured output');
    expect(promptBody.format.type).toBe('json_schema');
    expect(promptBody.parts[0]?.type).toBe('text');
    expect(promptBody.parts[0]?.text).toContain('User request: Create a backend architecture for a messaging app.');
  });

  it('should parse a JSON text payload when structured output is omitted', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'session-2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            info: {},
            parts: [
              {
                type: 'text',
                text: `\`\`\`json
{"workflow":"generate-diagram","summary":"Storyboard draft.","confidence":"medium","sections":[],"shapes":[],"connectors":[],"presentationBrief":{"title":"Storyboard","objective":"Teach storytelling.","audience":"Learners","summary":"Walk through the path.","narrativeSteps":["Start with the audience."],"speakerNotes":["Use one example."],"assumptions":["This is a first draft."],"openQuestions":["Which exercise should be added?"]},"warnings":[]}
\`\`\``,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const transport = new OpenCodeHttpTransport({
      baseUrl: 'http://127.0.0.1:4096',
      fetchImpl,
    });

    const response = await transport.send(buildGenerateDiagramRequest('Create a storyboard for learning storytelling.'));

    expect(response.summary).toBe('Storyboard draft.');
    expect(response.presentationBrief.title).toBe('Storyboard');
  });

  it('should surface unavailable-server failures as availability errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const transport = new OpenCodeHttpTransport({
      baseUrl: 'http://127.0.0.1:4096',
      fetchImpl,
    });

    await expect(
      transport.send(buildGenerateDiagramRequest('Create a backend architecture for a messaging app.'))
    ).rejects.toBeInstanceOf(OpenCodeTransportUnavailableError);
  });
});
