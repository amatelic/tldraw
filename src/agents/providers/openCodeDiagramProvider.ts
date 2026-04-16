import { MockOpenCodeTransport, OpenCodeClient } from '../openCodeClient';
import type {
  AgentGenerationProposal,
  AgentProvider,
  AgentRequest,
  AgentGenerationWarning,
} from '../../types/agents';

function createWarning(id: string, message: string): AgentGenerationWarning {
  return {
    id,
    severity: 'low',
    message,
  };
}

function withGeneratedWarnings(proposal: AgentGenerationProposal): AgentGenerationProposal {
  const warnings = [...proposal.warnings];

  if (proposal.confidence === 'low' && warnings.every((warning) => warning.id !== 'warning-low-confidence')) {
    warnings.push(
      createWarning(
        'warning-low-confidence',
        'This draft is low confidence. Review the structure and labels before sharing it.'
      )
    );
  }

  if (proposal.sections.length === 0 && warnings.every((warning) => warning.id !== 'warning-missing-sections')) {
    warnings.push(
      createWarning(
        'warning-missing-sections',
        'The draft does not include section grouping yet. Consider adding structure before presenting it.'
      )
    );
  }

  if (proposal.actions.length === 0 && warnings.every((warning) => warning.id !== 'warning-empty-draft')) {
    warnings.push(
      createWarning(
        'warning-empty-draft',
        'The provider returned an empty draft. Try refining the prompt before applying anything.'
      )
    );
  }

  return {
    ...proposal,
    warnings,
  };
}

export interface OpenCodeDiagramProviderOptions {
  client?: OpenCodeClient;
}

export class OpenCodeDiagramProvider implements AgentProvider {
  public readonly id = 'opencode-diagram-provider';
  public readonly workflow = 'generate-diagram' as const;

  private readonly client: OpenCodeClient;

  public constructor(options?: OpenCodeDiagramProviderOptions) {
    this.client =
      options?.client ??
      new OpenCodeClient({
        transport: new MockOpenCodeTransport(),
      });
  }

  public async generate(request: AgentRequest): Promise<AgentGenerationProposal> {
    if (request.workflow !== 'generate-diagram') {
      throw new Error(`OpenCodeDiagramProvider only supports "generate-diagram", received "${request.workflow}".`);
    }

    return withGeneratedWarnings(await this.client.request(request));
  }
}
