function SyntaxPart({ part }: { part: string }) {
  if (/^(and|or|not)$/.test(part)) {
    return <span className="kw">{part}</span>;
  }
  if (/^(equals|greater|less|greaterOrEquals|lessOrEquals|contains|startsWith|endsWith|empty|notEmpty|addDays|utcNow|item|triggerBody|formatDateTime|toLower|trim|length|coalesce|split|replace|concat|union|intersection)$/.test(part)) {
    return <span className="fn">{part}</span>;
  }
  if (/^'[^']*'$/.test(part)) {
    return <span className="str">{part}</span>;
  }
  if (/^\d+$/.test(part) || /^\d+\.\d+$/.test(part)) {
    return <span className="num">{part}</span>;
  }
  if (/^[(),@\]?]$/.test(part)) {
    return <span className="sym">{part}</span>;
  }
  return <span>{part}</span>;
}

function tokenizeExpression(expression: string): string[] {
  return expression.split(/(\b(?:and|or|not|equals|greater|less|greaterOrEquals|lessOrEquals|contains|startsWith|endsWith|empty|notEmpty|addDays|utcNow|item|triggerBody|formatDateTime|toLower|trim|length|coalesce|split|replace|concat|union|intersection)\b|'[^']*'|\d+(?:\.\d+)?|[(),@\]?])/g).filter(Boolean);
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
