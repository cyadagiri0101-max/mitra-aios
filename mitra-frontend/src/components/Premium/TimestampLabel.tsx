interface TimestampLabelProps {
  label: string;
  className?: string;
}

export function TimestampLabel({ label, className = '' }: TimestampLabelProps) {
  return (
    <span className={`text-[10px] font-mono text-[#8892B0] ${className}`}>
      {label}
    </span>
  );
}
