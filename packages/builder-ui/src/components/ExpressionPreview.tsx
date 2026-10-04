const FUNCTION_NAMES =
  'equals|greater|less|greaterOrEquals|lessOrEquals|contains|startsWith|endsWith|empty|notEmpty|addDays|utcNow|item|items|triggerBody|triggerOutputs|outputs|body|formatDateTime|toLower|trim|length|coalesce|split|replace|concat|union|intersection';

const KEYWORD = /^(?:and|or|not)$/;
const FUNCTION = new RegExp(`^(?:${FUNCTION_NAMES})$`);
// A doubled apostrophe stays inside its string: 'O''Brien' is one token.
const STRING = /^'(?:[^']|'')*'$/;
const NUMBER = /^\d+(?:\.\d+)?$/;
const SYMBOL = /^[(),@?[\]{}]$/;
const TOKENS = new RegExp(`(\\b(?:and|or|not|${FUNCTION_NAMES})\\b|'(?:[^']|'')*'|\\d+(?:\\.\\d+)?|[(),@?[\\]{}])`);

function SyntaxPart({ part }: { part: string }) {
  if (KEYWORD.test(part)) {
    return <span className="kw">{part}</span>;
  }
  if (FUNCTION.test(part)) {
    return <span className="fn">{part}</span>;
  }
  if (STRING.test(part)) {
    return <span className="str">{part}</span>;
  }
  if (NUMBER.test(part)) {
    return <span className="num">{part}</span>;
  }
  if (SYMBOL.test(part)) {
    return <span className="sym">{part}</span>;
  }
  return <span>{part}</span>;
}

/** Display only: the tokens always join back into exactly the expression text. */
function tokenizeExpression(expression: string): string[] {
  return expression.split(TOKENS).filter(Boolean);
}

interface ExpressionPreviewProps {
  expression: string;
  label?: string;
}

export function ExpressionPreview({ expression, label = 'Generated expression' }: ExpressionPreviewProps) {
  return (
    <pre className="eb-preview" aria-label={label}>
      {tokenizeExpression(expression).map((part, index) => (
        <SyntaxPart key={`${part}-${index}`} part={part} />
      ))}
    </pre>
  );
}
