import type {
  AgentMutationProposal,
  AgentProvider,
  AgentRequest,
  AgentShapeSummary,
  AgentUpdateShapeAction,
} from '../../types/agents';

const SHORTEN_KEYWORDS = ['shorten', 'shorter', 'slide', 'slides', 'label', 'labels'];
const CLARITY_KEYWORDS = ['clear', 'clearer', 'clarity', 'product language', 'rewrite', 'simplify'];
const FLOW_KEYWORDS = ['flow', 'theme', 'group', 'grouped'];
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'this',
  'to',
  'with',
]);

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\butili[sz]e\b/gi, 'use'],
  [/\bimplementation\b/gi, 'setup'],
  [/\bfunctionality\b/gi, 'feature'],
  [/\bconfiguration\b/gi, 'setup'],
  [/\bworkflow(s)?\b/gi, 'flow$1'],
  [/\bstakeholder(s)?\b/gi, 'team$1'],
  [/\bsaas\b/gi, 'SaaS'],
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && word.length <= 4) {
        return word;
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

function toSentenceCase(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return normalized;
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function shortenText(value: string, maxWords: number): string {
  const words = normalizeWhitespace(value).split(/\s+/);
  const filteredWords = words.filter((word, index) => {
    const normalizedWord = cleanWord(word);
    return index === 0 || !STOP_WORDS.has(normalizedWord);
  });

  return toTitleCase(filteredWords.slice(0, maxWords).join(' '));
}

function simplifyText(value: string): string {
  let rewritten = normalizeWhitespace(value)
    .replace(/[/:]+/g, ' ')
    .replace(/\s*[-–]\s*/g, ' ');

  for (const [pattern, replacement] of REPLACEMENTS) {
    rewritten = rewritten.replace(pattern, replacement);
  }

  const words = rewritten.split(/\s+/);
  if (words.length > 8) {
    rewritten = words.slice(0, 8).join(' ');
  }

  return toSentenceCase(rewritten);
}

function rewriteText(value: string, prompt: string): string {
  const normalized = normalizeWhitespace(value);
  const normalizedPrompt = prompt.toLowerCase();

  if (!normalized) {
    return normalized;
  }

  if (SHORTEN_KEYWORDS.some((keyword) => normalizedPrompt.includes(keyword))) {
    return shortenText(normalized, 4);
  }

  if (FLOW_KEYWORDS.some((keyword) => normalizedPrompt.includes(keyword))) {
    return shortenText(normalized, 3);
  }

  if (CLARITY_KEYWORDS.some((keyword) => normalizedPrompt.includes(keyword))) {
    return simplifyText(normalized);
  }

  return simplifyText(normalized);
}

function buildRewriteAction(shape: AgentShapeSummary, prompt: string): AgentUpdateShapeAction | null {
  const currentText = normalizeWhitespace(shape.text ?? '');
  const rewrittenText = rewriteText(currentText, prompt);

  if (!rewrittenText || rewrittenText === currentText) {
    return null;
  }

  return {
    type: 'update-shape',
    targetId: shape.id,
    description: `Rewrite "${currentText}" for clarity.`,
    changes: {
      text: rewrittenText,
    },
  };
}

export class SelectionRewriteProvider implements AgentProvider {
  public readonly id = 'selection-rewrite-provider';
  public readonly workflow = 'rewrite-selection' as const;

  public async generate(request: AgentRequest): Promise<AgentMutationProposal> {
    const selectedTextShapes = request.context.textShapes.filter((shape) =>
      request.context.selectedShapeIds.includes(shape.id)
    );

    if (selectedTextShapes.length === 0) {
      throw new Error('Selection Rewrite needs at least one selected text shape.');
    }

    const actions = selectedTextShapes
      .map((shape) => buildRewriteAction(shape, request.prompt))
      .filter((action): action is AgentUpdateShapeAction => action !== null);

    const summary =
      actions.length === 0
        ? 'The selected text already reads clearly enough for this rewrite pass.'
        : `Prepared ${actions.length} rewrite${actions.length === 1 ? '' : 's'} for the selected text.`;

    return {
      kind: 'mutation',
      workflow: 'rewrite-selection',
      summary,
      actions,
    };
  }
}
