import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendChipProps {
  trend?: number;
  direction?: 'up' | 'down' | 'stable';
  label?: string;
  className?: string;
}

export function TrendChip({
  trend,
  direction = 'stable',
  label,
  className = '',
}: TrendChipProps) {
  const TrendIcon = direction === 'up'
    ? ArrowUpRight
    : direction === 'down'
      ? ArrowDownRight
      : Minus;

  const color = direction === 'up'
    ? '#2ECC71'
    : direction === 'down'
      ? '#E74C3C'
      : '#8892B0';

  const valueText = trend !== undefined
    ? `${trend >= 0 ? '+' : ''}${trend}%`
    : direction === 'stable'
      ? 'Stable'
      : '';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${className}`}
      style={{ color }}
    >
      <TrendIcon className="w-3.5 h-3.5" />
      {valueText}
      {label && <span className="text-[#8892B0] ml-1">{label}</span>}
    </span>
  );
}
