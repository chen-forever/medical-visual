interface SealProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  vertical?: boolean;
  className?: string;
}

export function Seal({ text = '岐黄', size = 'md', vertical = false, className = '' }: SealProps) {
  return (
    <span
      className={`tcm-seal tcm-seal-${size} ${vertical ? 'is-vertical' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <span>{text}</span>
    </span>
  );
}

export function TaijiMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`tcm-taiji ${className}`.trim()} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
      <path
        d="M50 4a46 46 0 0 1 0 92 23 23 0 0 1 0-46 23 23 0 0 0 0-46Z"
        fill="currentColor"
        opacity=".82"
      />
      <circle cx="50" cy="27" r="7" fill="#fbf7ee" />
      <circle cx="50" cy="73" r="7" fill="currentColor" />
    </svg>
  );
}

export function CloudCorner({
  className = '',
  position = 'tl',
}: {
  className?: string;
  position?: 'tl' | 'tr' | 'bl' | 'br';
}) {
  return (
    <svg
      className={`tcm-cloud-corner tcm-cloud-${position} ${className}`.trim()}
      viewBox="0 0 80 80"
      aria-hidden="true"
    >
      <path d="M4 76V32C4 16 16 4 32 4h44" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M12 76V36c0-13 10-24 24-24h40" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <path
        d="M28 28c0-5 4-9 9-9 4 0 7 2 8 6 5-2 10 2 10 7 0 3-2 6-6 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M42 48c0-4 3-7 7-7 4 0 7 3 7 7" fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
    </svg>
  );
}

export function MeridianDivider({ label }: { label?: string }) {
  return (
    <div className="tcm-divider" aria-hidden="true">
      <span />
      {label ? <i>{label}</i> : null}
      <span />
    </div>
  );
}
