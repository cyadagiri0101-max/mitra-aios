import { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

interface AnimatedNumberProps {
  value: number;
  displayValue?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  className?: string;
  loading?: boolean;
}

export function AnimatedNumber({
  value,
  displayValue,
  prefix = '',
  suffix = '',
  duration = 2,
  delay = 0,
  className = '',
  loading = false,
}: AnimatedNumberProps) {
  const { ref, inView: isInView } = useInView({ triggerOnce: true, rootMargin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, hasAnimated, delay]);

  if (loading) {
    return (
      <span className={`inline-block w-16 h-8 rounded bg-white/10 animate-pulse ${className}`} />
    );
  }

  if (displayValue) {
    return (
      <span ref={ref} className={`inline-block ${className}`}>
        {prefix}{displayValue}{suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {hasAnimated ? (
        <CountUp
          end={value}
          duration={duration}
          prefix={prefix}
          suffix={suffix}
          separator=","
        />
      ) : (
        <span>{prefix}0{suffix}</span>
      )}
    </span>
  );
}
