interface ExpressionPreviewProps {
  expression: string;
  label?: string;
}

export function ExpressionPreview({ expression, label = 'Generated expression' }: ExpressionPreviewProps) {
  return (
    <pre className="eb-preview" aria-label={label}>
      {expression}
    </pre>
  );
}
