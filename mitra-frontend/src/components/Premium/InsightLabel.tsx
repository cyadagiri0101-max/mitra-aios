interface InsightLabelProps {
  children: string;
  className?: string;
}

export function InsightLabel({ children, className = '' }: InsightLabelProps) {
  return (
    <p className={`text-xs text-[#A1A1A6] line-clamp-2 ${className}`}>
      {children}
    </p>
  );
}
