import type { SVGProps } from 'react';

function SvgIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props} />
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </SvgIcon>
  );
}

// Filled glyphs, so they opt out of SvgIcon's stroke.
export function TextAlignLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path fill="currentColor" stroke="none" d="M2 5.75C2 5.33579 2.33579 5 2.75 5H18.25C18.6642 5 19 5.33579 19 5.75C19 6.16421 18.6642 6.5 18.25 6.5H2.75C2.33579 6.5 2 6.16421 2 5.75ZM2 18.75C2 18.3358 2.33579 18 2.75 18H13.25C13.6642 18 14 18.3358 14 18.75C14 19.1642 13.6642 19.5 13.25 19.5H2.75C2.33579 19.5 2 19.1642 2 18.75ZM2.75 11.5C2.33579 11.5 2 11.8358 2 12.25C2 12.6642 2.33579 13 2.75 13H21.25C21.6642 13 22 12.6642 22 12.25C22 11.8358 21.6642 11.5 21.25 11.5H2.75Z" />
    </SvgIcon>
  );
}

export function TextAlignRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path fill="currentColor" stroke="none" d="M5 5.75C5 5.33579 5.33579 5 5.75 5H21.25C21.6642 5 22 5.33579 22 5.75C22 6.16421 21.6642 6.5 21.25 6.5H5.75C5.33579 6.5 5 6.16421 5 5.75ZM10 18.75C10 18.3358 10.3358 18 10.75 18H21.25C21.6642 18 22 18.3358 22 18.75C22 19.1642 21.6642 19.5 21.25 19.5H10.75C10.3358 19.5 10 19.1642 10 18.75ZM2.75 11.5C2.33579 11.5 2 11.8358 2 12.25C2 12.6642 2.33579 13 2.75 13H21.25C21.6642 13 22 12.6642 22 12.25C22 11.8358 21.6642 11.5 21.25 11.5H2.75Z" />
    </SvgIcon>
  );
}

export function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props} strokeWidth="1.6">
      <circle cx="9" cy="6" r="1.2" fill="currentColor" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" />
    </SvgIcon>
  );
}

export function ImportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </SvgIcon>
  );
}

export function ExportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </SvgIcon>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="15 18 9 12 15 6" />
    </SvgIcon>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="9 18 15 12 9 6" />
    </SvgIcon>
  );
}

export function ChevronUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="18 15 12 9 6 15" />
    </SvgIcon>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="6 9 12 15 18 9" />
    </SvgIcon>
  );
}

export function MoveToGroupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M9 13h6M12 10v6" />
    </SvgIcon>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </SvgIcon>
  );
}

export function DuplicateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </SvgIcon>
  );
}

export function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </SvgIcon>
  );
}

export function BuilderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </SvgIcon>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </SvgIcon>
  );
}

export function OkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props} strokeWidth="2.2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </SvgIcon>
  );
}

export function WarnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </SvgIcon>
  );
}

export function ErrorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </SvgIcon>
  );
}

export function WrapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M5 8h10a3 3 0 0 1 0 6H7" />
      <path d="m9 11-3 3 3 3" />
    </SvgIcon>
  );
}

