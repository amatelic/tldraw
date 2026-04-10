import type {
  AgentProvider,
  AgentRequest,
  AgentReviewFinding,
  AgentReviewFindingCategory,
  AgentReviewProposal,
} from '../../types/agents';

function createFinding(
  category: AgentReviewFindingCategory,
  severity: AgentReviewFinding['severity'],
  title: string,
  detail: string,
  targetIds: string[] = []
): AgentReviewFinding {
  return {
    id: `finding-${category}-${title.toLowerCase().replace(/\s+/g, '-')}`,
    category,
    severity,
    title,
    detail,
    targetIds,
  };
}

export class ReviewModeProvider implements AgentProvider {
  public readonly id = 'mock-review-provider';
  public readonly workflow = 'review' as const;

  public async generate(request: AgentRequest): Promise<AgentReviewProposal> {
    const { shapes, textShapes, selectedShapeIds, scope } = request.context;
    const findings: AgentReviewFinding[] = [];
    const trimmedPrompt = request.prompt.trim();

    const emptyTextShapes = textShapes.filter((shape) => !shape.text?.trim());
    if (emptyTextShapes.length > 0) {
      findings.push(
        createFinding(
          'clarity',
          'medium',
          'Empty text blocks',
          'One or more text shapes are blank. Remove them or add labels so the board reads clearly.',
          emptyTextShapes.map((shape) => shape.id)
        )
      );
    }

    const meaningfulTextShapes = textShapes.filter((shape) => Boolean(shape.text?.trim()));
    if (shapes.length > 0 && meaningfulTextShapes.length === 0) {
      findings.push(
        createFinding(
          'missing-information',
          'high',
          'Add labels or callouts',
          'This area has shapes but no text. Adding labels or short callouts would make the intent easier to understand.'
        )
      );
    }

    const distinctColors = new Set(shapes.map((shape) => shape.style.color));
    if (distinctColors.size >= 4) {
      findings.push(
        createFinding(
          'consistency',
          'medium',
          'Too many stroke colors',
          'There are several different stroke colors in the same scope. Tightening the palette would make the board feel more intentional.'
        )
      );
    }

    const distinctStrokeWidths = new Set(shapes.map((shape) => shape.style.strokeWidth));
    if (distinctStrokeWidths.size >= 3) {
      findings.push(
        createFinding(
          'consistency',
          'low',
          'Mixed stroke weights',
          'Stroke widths vary a lot across the current scope. Standardizing them would improve visual consistency.'
        )
      );
    }

    if (shapes.length >= 6) {
      findings.push(
        createFinding(
          'suggested-next-edits',
          'low',
          'Tighten the layout',
          'A quick pass on spacing and alignment would probably improve scanability before you share or present this board.',
          selectedShapeIds
        )
      );
    }

    if (trimmedPrompt) {
      findings.push(
        createFinding(
          'suggested-next-edits',
          'low',
          'Review prompt noted',
          `The review took your note into account: "${trimmedPrompt}". Use it as the lens for the next cleanup pass.`
        )
      );
    }

    const areaLabel =
      scope === 'selection'
        ? 'selection'
        : scope === 'visible-board'
          ? 'visible board'
          : 'full board';
    const summary =
      findings.length === 0
        ? `No obvious issues found in the ${areaLabel}.`
        : `Reviewed ${shapes.length} shapes in the ${areaLabel} and found ${findings.length} item${findings.length === 1 ? '' : 's'}.`;

    return {
      kind: 'review',
      workflow: 'review',
      summary,
      findings,
    };
  }
}
