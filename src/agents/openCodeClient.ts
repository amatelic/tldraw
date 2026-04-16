import type { Bounds, ShapeStyle } from '../types';
import type {
  AgentConfidence,
  AgentGeneratedConnectorType,
  AgentGeneratedShapeType,
  AgentGenerationProposal,
  AgentRequest,
} from '../types/agents';

export interface OpenCodeRequest {
  workflow: AgentRequest['workflow'];
  prompt: string;
  context: AgentRequest['context'];
}

export interface OpenCodePresentationBriefResponse {
  title?: string;
  objective?: string;
  audience?: string;
  summary?: string;
  narrativeSteps?: string[];
  speakerNotes?: string[];
  assumptions?: string[];
  openQuestions?: string[];
}

export interface OpenCodeDiagramSectionResponse {
  id: string;
  title: string;
  summary: string;
  shapeIds: string[];
}

export interface OpenCodeGeneratedShapeResponse {
  id: string;
  type: AgentGeneratedShapeType;
  bounds: Bounds;
  style?: Partial<ShapeStyle>;
  text?: string;
}

export interface OpenCodeGeneratedConnectorResponse {
  id: string;
  type: AgentGeneratedConnectorType;
  sourceId?: string;
  targetId?: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  style?: Partial<ShapeStyle>;
  label?: string | null;
}

export interface OpenCodeWarningResponse {
  id: string;
  severity: AgentConfidence;
  message: string;
}

export interface OpenCodeDiagramResponse {
  workflow: 'generate-diagram';
  summary: string;
  confidence?: AgentConfidence;
  sections?: OpenCodeDiagramSectionResponse[];
  shapes: OpenCodeGeneratedShapeResponse[];
  connectors?: OpenCodeGeneratedConnectorResponse[];
  presentationBrief: OpenCodePresentationBriefResponse;
  warnings?: OpenCodeWarningResponse[];
}

export interface OpenCodeTransport {
  send(request: OpenCodeRequest): Promise<OpenCodeDiagramResponse>;
}

function normalizeList(values: string[] | undefined, fallback: string): string[] {
  if (!values || values.length === 0) {
    return [fallback];
  }

  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

export function normalizeOpenCodeDiagramResponse(
  response: OpenCodeDiagramResponse
): AgentGenerationProposal {
  return {
    kind: 'generation',
    workflow: 'generate-diagram',
    summary: response.summary.trim(),
    confidence: response.confidence ?? 'medium',
    sections: (response.sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      shapeIds: [...section.shapeIds],
    })),
    actions: [
      ...response.shapes.map((shape) => ({
        type: 'create-shape' as const,
        description: `Create ${shape.type} ${shape.id}`,
        shape: {
          id: shape.id,
          type: shape.type,
          bounds: { ...shape.bounds },
          style: shape.style ? { ...shape.style } : undefined,
          text: shape.text,
        },
      })),
      ...(response.connectors ?? []).map((connector) => ({
        type: 'create-connector' as const,
        description: `Create ${connector.type} ${connector.id}`,
        connector: {
          id: connector.id,
          type: connector.type,
          sourceId: connector.sourceId,
          targetId: connector.targetId,
          start: { ...connector.start },
          end: { ...connector.end },
          style: connector.style ? { ...connector.style } : undefined,
          label: connector.label ?? null,
        },
      })),
    ],
    presentationBrief: {
      title: response.presentationBrief.title?.trim() ?? '',
      objective: response.presentationBrief.objective?.trim() ?? '',
      audience: response.presentationBrief.audience?.trim() ?? '',
      summary: response.presentationBrief.summary?.trim() ?? '',
      narrativeSteps: normalizeList(response.presentationBrief.narrativeSteps, 'Explain the diagram structure.'),
      speakerNotes: normalizeList(response.presentationBrief.speakerNotes, 'Walk through the main entities and flow.'),
      assumptions: normalizeList(response.presentationBrief.assumptions, 'This is a first-draft diagram.'),
      openQuestions: normalizeList(response.presentationBrief.openQuestions, 'What needs deeper technical validation?'),
    },
    warnings: (response.warnings ?? []).map((warning) => ({
      id: warning.id,
      severity: warning.severity,
      message: warning.message.trim(),
    })),
  };
}

function createArchitectureResponse(prompt: string): OpenCodeDiagramResponse {
  const promptLabel = prompt.trim() || 'Messaging architecture';

  return {
    workflow: 'generate-diagram',
    summary: `Drafted a simple architecture view for ${promptLabel}.`,
    confidence: 'medium',
    sections: [
      {
        id: 'section-clients',
        title: 'Clients',
        summary: 'Entry points that send and receive messages.',
        shapeIds: ['node-clients'],
      },
      {
        id: 'section-services',
        title: 'Core Services',
        summary: 'Request handling, auth, and delivery services.',
        shapeIds: ['node-api', 'node-auth', 'node-messages'],
      },
      {
        id: 'section-data',
        title: 'Data & Delivery',
        summary: 'Persistence, queueing, and notification fan-out.',
        shapeIds: ['node-queue', 'node-storage', 'node-notifications'],
      },
    ],
    shapes: [
      {
        id: 'node-clients',
        type: 'rectangle',
        bounds: { x: 80, y: 100, width: 180, height: 80 },
        text: 'Web / Mobile Clients',
      },
      {
        id: 'node-api',
        type: 'rectangle',
        bounds: { x: 340, y: 100, width: 180, height: 80 },
        text: 'API Gateway',
      },
      {
        id: 'node-auth',
        type: 'rectangle',
        bounds: { x: 340, y: 220, width: 180, height: 80 },
        text: 'Auth Service',
      },
      {
        id: 'node-messages',
        type: 'rectangle',
        bounds: { x: 600, y: 100, width: 200, height: 80 },
        text: 'Message Service',
      },
      {
        id: 'node-queue',
        type: 'rectangle',
        bounds: { x: 600, y: 220, width: 200, height: 80 },
        text: 'Delivery Queue',
      },
      {
        id: 'node-storage',
        type: 'rectangle',
        bounds: { x: 860, y: 100, width: 180, height: 80 },
        text: 'Message Store',
      },
      {
        id: 'node-notifications',
        type: 'rectangle',
        bounds: { x: 860, y: 220, width: 180, height: 80 },
        text: 'Push / Email Notifications',
      },
    ],
    connectors: [
      {
        id: 'connector-clients-api',
        type: 'arrow',
        sourceId: 'node-clients',
        targetId: 'node-api',
        start: { x: 260, y: 140 },
        end: { x: 340, y: 140 },
      },
      {
        id: 'connector-api-messages',
        type: 'arrow',
        sourceId: 'node-api',
        targetId: 'node-messages',
        start: { x: 520, y: 140 },
        end: { x: 600, y: 140 },
      },
      {
        id: 'connector-api-auth',
        type: 'arrow',
        sourceId: 'node-api',
        targetId: 'node-auth',
        start: { x: 430, y: 180 },
        end: { x: 430, y: 220 },
      },
      {
        id: 'connector-messages-queue',
        type: 'arrow',
        sourceId: 'node-messages',
        targetId: 'node-queue',
        start: { x: 700, y: 180 },
        end: { x: 700, y: 220 },
      },
      {
        id: 'connector-messages-storage',
        type: 'arrow',
        sourceId: 'node-messages',
        targetId: 'node-storage',
        start: { x: 800, y: 140 },
        end: { x: 860, y: 140 },
      },
      {
        id: 'connector-queue-notifications',
        type: 'arrow',
        sourceId: 'node-queue',
        targetId: 'node-notifications',
        start: { x: 800, y: 260 },
        end: { x: 860, y: 260 },
      },
    ],
    presentationBrief: {
      title: 'Messaging App Backend Architecture',
      objective: 'Explain the core backend services required to send, persist, and deliver messages.',
      audience: 'Product and engineering stakeholders',
      summary: 'Start at the client entry point, move through request handling, then finish with delivery and storage responsibilities.',
      narrativeSteps: [
        'Start with the client entry points and the API gateway.',
        'Explain how authentication protects message operations.',
        'Walk through message handling, persistence, and asynchronous delivery.',
      ],
      speakerNotes: [
        'Keep the first pass high level and focus on message flow.',
        'Call out the queue as the boundary between synchronous and asynchronous work.',
      ],
      assumptions: [
        'Realtime delivery is handled by the message service and queue pipeline.',
        'Notifications are triggered after the core message event is stored.',
      ],
      openQuestions: [
        'Do we need regional data isolation or multi-tenant concerns?',
        'Should websocket infrastructure be shown as a dedicated service in a later revision?',
      ],
    },
    warnings: [
      {
        id: 'warning-realtime',
        severity: 'low',
        message: 'Realtime websocket infrastructure is summarized inside the message service in this first draft.',
      },
    ],
  };
}

function createStoryboardResponse(prompt: string): OpenCodeDiagramResponse {
  const promptLabel = prompt.trim() || 'Learning storytelling';

  return {
    workflow: 'generate-diagram',
    summary: `Drafted a simple storyboard for ${promptLabel}.`,
    confidence: 'medium',
    sections: [
      {
        id: 'section-foundations',
        title: 'Foundations',
        summary: 'Understand story structure and audience.',
        shapeIds: ['story-foundations', 'story-structure'],
      },
      {
        id: 'section-practice',
        title: 'Practice',
        summary: 'Draft, test, and refine your story.',
        shapeIds: ['story-practice', 'story-feedback'],
      },
      {
        id: 'section-delivery',
        title: 'Delivery',
        summary: 'Present the story and iterate after reflection.',
        shapeIds: ['story-deliver', 'story-iterate'],
      },
    ],
    shapes: [
      {
        id: 'story-foundations',
        type: 'rectangle',
        bounds: { x: 80, y: 160, width: 160, height: 72 },
        text: 'Know the audience',
      },
      {
        id: 'story-structure',
        type: 'rectangle',
        bounds: { x: 280, y: 160, width: 160, height: 72 },
        text: 'Learn narrative structure',
      },
      {
        id: 'story-practice',
        type: 'rectangle',
        bounds: { x: 480, y: 160, width: 160, height: 72 },
        text: 'Practice with small stories',
      },
      {
        id: 'story-feedback',
        type: 'rectangle',
        bounds: { x: 680, y: 160, width: 160, height: 72 },
        text: 'Collect feedback',
      },
      {
        id: 'story-deliver',
        type: 'rectangle',
        bounds: { x: 880, y: 160, width: 160, height: 72 },
        text: 'Present with confidence',
      },
      {
        id: 'story-iterate',
        type: 'rectangle',
        bounds: { x: 1080, y: 160, width: 160, height: 72 },
        text: 'Reflect and iterate',
      },
    ],
    connectors: [
      {
        id: 'story-1',
        type: 'arrow',
        sourceId: 'story-foundations',
        targetId: 'story-structure',
        start: { x: 240, y: 196 },
        end: { x: 280, y: 196 },
      },
      {
        id: 'story-2',
        type: 'arrow',
        sourceId: 'story-structure',
        targetId: 'story-practice',
        start: { x: 440, y: 196 },
        end: { x: 480, y: 196 },
      },
      {
        id: 'story-3',
        type: 'arrow',
        sourceId: 'story-practice',
        targetId: 'story-feedback',
        start: { x: 640, y: 196 },
        end: { x: 680, y: 196 },
      },
      {
        id: 'story-4',
        type: 'arrow',
        sourceId: 'story-feedback',
        targetId: 'story-deliver',
        start: { x: 840, y: 196 },
        end: { x: 880, y: 196 },
      },
      {
        id: 'story-5',
        type: 'arrow',
        sourceId: 'story-deliver',
        targetId: 'story-iterate',
        start: { x: 1040, y: 196 },
        end: { x: 1080, y: 196 },
      },
    ],
    presentationBrief: {
      title: 'Storyboard for Learning Storytelling',
      objective: 'Show a step-by-step path for building storytelling skill through structure, practice, and delivery.',
      audience: 'Learners, coaches, or workshop attendees',
      summary: 'Move left to right from mindset and structure into repetition, feedback, and confident delivery.',
      narrativeSteps: [
        'Set up why audience awareness comes first.',
        'Explain how structure makes stories easier to build and remember.',
        'Show practice, feedback, and iteration as a repeating loop.',
      ],
      speakerNotes: [
        'Keep the sequence simple and practical rather than theoretical.',
        'Use one personal or team example to make the storyboard memorable.',
      ],
      assumptions: [
        'The learner is starting from beginner or early intermediate level.',
        'Feedback is available from peers, mentors, or recorded practice.',
      ],
      openQuestions: [
        'Should the board include recommended exercises or example prompts?',
        'Do we want to show practice and feedback as a loop instead of a linear path?',
      ],
    },
    warnings: [
      {
        id: 'warning-depth',
        severity: 'low',
        message: 'Exercises and references are not included in this first-pass storyboard.',
      },
    ],
  };
}

export class MockOpenCodeTransport implements OpenCodeTransport {
  public async send(request: OpenCodeRequest): Promise<OpenCodeDiagramResponse> {
    const prompt = request.prompt.toLowerCase();

    if (request.workflow !== 'generate-diagram') {
      throw new Error(`Mock OpenCode transport only supports "generate-diagram", received "${request.workflow}".`);
    }

    if (prompt.includes('story')) {
      return createStoryboardResponse(request.prompt);
    }

    return createArchitectureResponse(request.prompt);
  }
}

export interface OpenCodeClientOptions {
  transport: OpenCodeTransport;
  fallbackTransport?: OpenCodeTransport | null;
}

export class OpenCodeClient {
  private readonly transport: OpenCodeTransport;
  private readonly fallbackTransport: OpenCodeTransport | null;

  public constructor({ transport, fallbackTransport = new MockOpenCodeTransport() }: OpenCodeClientOptions) {
    this.transport = transport;
    this.fallbackTransport = fallbackTransport;
  }

  public async request(request: AgentRequest): Promise<AgentGenerationProposal> {
    if (request.workflow !== 'generate-diagram') {
      throw new Error(`OpenCodeClient only supports "generate-diagram", received "${request.workflow}".`);
    }

    const payload: OpenCodeRequest = {
      workflow: request.workflow,
      prompt: request.prompt,
      context: request.context,
    };

    try {
      return normalizeOpenCodeDiagramResponse(await this.transport.send(payload));
    } catch (error) {
      if (!this.fallbackTransport) {
        throw error;
      }

      return normalizeOpenCodeDiagramResponse(await this.fallbackTransport.send(payload));
    }
  }
}
