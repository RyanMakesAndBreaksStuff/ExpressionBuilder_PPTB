import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionButtonVariant = 'primary' | 'subtle' | 'ghost' | 'icon';

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  icon?: ReactNode;
  label?: string;
  variant?: ActionButtonVariant;
}

export function ActionButton({
  children,
  className,
  icon,
  label,
  type = 'button',
  variant = 'subtle',
  ...props
}: ActionButtonProps) {
  const iconOnly = variant === 'icon' || (children === undefined && icon !== undefined);
  const accessibleLabel = props['aria-label'] ?? label;

  if (iconOnly && !accessibleLabel) {
    throw new Error('ActionButton icon-only usage requires an accessible label.');
  }

  const classes = ['eb-action-btn', `eb-action-${variant}`, className].filter(Boolean).join(' ');
  const visibleChildren = variant === 'icon' ? null : children;

  return (
    <button type={type} className={classes} aria-label={accessibleLabel} {...props}>
      {icon ? <span className="eb-action-icon" aria-hidden="true">{icon}</span> : null}
      {visibleChildren ? <span>{visibleChildren}</span> : null}
    </button>
  );
}
