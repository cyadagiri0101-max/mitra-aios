import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, AlertCircle, Lock, Mail, ArrowRight,
  Zap, Cpu, Wand2, Shield, Activity, Boxes,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RobotCanvas } from '../components/Robot/RobotCanvas';
import { AuroraBackground } from '../components/Premium/AuroraBackground';
import { GlassCard } from '../components/Premium/GlassCard';
import { PremiumButton } from '../components/Premium/PremiumButton';
import { GradientText } from '../components/Premium/GradientText';

interface LoginFormData {
  email: string;
  password: string;
}

interface MousePos {
  x: number;
  y: number;
}

type TransitionPhase = 'idle' | 'success' | 'launch' | 'done';

const FEATURES = [
  { icon: Zap, label: 'Real-time', value: 'Live Ops' },
  { icon: Cpu, label: 'Intelligent', value: 'AI-Powered' },
  { icon: Wand2, label: 'Adaptive', value: 'Learning' },
];

const METRICS = [
  { label: 'Uptime', value: '99.9%' },
  { label: 'Projects', value: '10k+' },
  { label: 'Decisions', value: 'AI' },
];

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: 'Weak', color: '#FF3B30', width: '25%' },
    { label: 'Fair', color: '#FF9500', width: '50%' },
    { label: 'Good', color: '#64FFDA', width: '75%' },
    { label: 'Strong', color: '#34C759', width: '100%' },
  ];
  return levels[Math.min(score, 3)];
}

function HeroRobot({ mousePos }: { mousePos: MousePos }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 h-[420px] w-full max-w-[520px]"
      style={{
        transform: `perspective(1000px) rotateX(${(mousePos.y - 0.5) * 8}deg) rotateY(${(mousePos.x - 0.5) * 8}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      <RobotCanvas
        state="greeting"
        emotion="happy"
        gesture="wave"
        speaking={false}
        mouthOpen={0.1}
        physics={{ floatSpeed: 1.2, floatAmplitude: 0.09, docked: false }}
      />
    </motion.div>
  );
}

function HeroSection({
  mousePos,
  onRobotRef,
}: {
  mousePos: MousePos;
  onRobotRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center relative p-10 xl:p-16"
    >
      {/* Robot */}
      <div ref={onRobotRef} className="relative z-10">
        <HeroRobot mousePos={mousePos} />
      </div>

      {/* Brand Text */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center mt-8 max-w-xl"
      >
        <h1 className="text-5xl xl:text-6xl font-bold mb-4 tracking-tight text-white">
          MITRA{' '}
          <GradientText variant="cyan" animate={false}>AI</GradientText>
        </h1>
        <p className="text-lg xl:text-xl leading-relaxed mb-10 text-[#A1A1A6]">
          Manufacturing Intelligence Operating System
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {FEATURES.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="rounded-2xl p-4 glass-subtle transition-all duration-300 hover:scale-105 hover:border-cyan-500/30"
            >
              <item.icon className="w-5 h-5 mx-auto mb-2 text-cyan-300" />
              <p className="text-xs text-[#A1A1A6]">{item.label}</p>
              <p className="text-sm font-bold mt-0.5 text-white">{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Metrics row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex items-center justify-center gap-6 text-sm"
        >
          {METRICS.map((metric, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#A1A1A6]">{metric.label}:</span>
              <span className="font-mono font-semibold text-white">{metric.value}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function LoginForm({
  isTransitioning,
  onSubmit,
}: {
  isTransitioning: boolean;
  onSubmit: (data: LoginFormData) => Promise<void>;
}) {
  const { isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({ mode: 'onBlur' });

  const password = watch('password') || '';
  const strength = getPasswordStrength(password);

  const handleFormSubmit = async (data: LoginFormData) => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error(`Too many failed attempts. Try again in ${remaining}s.`);
      return;
    }

    try {
      await onSubmit(data);
      setAttempts(0);
      setLockoutUntil(null);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        const delay = Math.min(30000 * Math.pow(2, newAttempts - 5), 300000);
        setLockoutUntil(Date.now() + delay);
        toast.error(`Account locked. Try again in ${Math.ceil(delay / 1000)}s.`);
      } else {
        const msg = err?.response?.data?.message;
        toast.error(msg || 'Invalid credentials');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 flex items-center justify-center p-6 relative z-10"
    >
      <div className="w-full max-w-md">
        <GlassCard glowColor="cyan" intensity="medium" className="relative">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
              style={{
                background: 'linear-gradient(135deg, rgba(100, 255, 218, 0.15) 0%, rgba(0, 180, 216, 0.1) 100%)',
                border: '1px solid rgba(100, 255, 218, 0.25)',
              }}
            >
              <Shield className="w-6 h-6 text-cyan-300" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-3xl font-bold mb-2 text-white"
            >
              Access MITRA
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-mono text-[#A1A1A6]"
            >
              Manufacturing Intelligence System
            </motion.p>
          </div>

          <AnimatePresence>
            {lockoutUntil && Date.now() < lockoutUntil && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl flex items-center gap-3 border"
                style={{
                  backgroundColor: 'rgba(255, 59, 48, 0.1)',
                  borderColor: 'rgba(255, 59, 48, 0.2)',
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-400">
                  Account locked. Try again in {Math.ceil((lockoutUntil - Date.now()) / 1000)}s.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#A1A1A6]">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-[#A1A1A6] transition-colors group-focus-within:text-cyan-300" />
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Valid email required' },
                  })}
                  className="w-full rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition-all duration-200 bg-white/5 border border-cyan-400/10 text-white placeholder:text-[#A1A1A6]/60 focus-glow focus:border-cyan-400/40 focus:bg-white/[0.07]"
                  placeholder="you@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-xs flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" /> {errors.email.message?.toString()}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#A1A1A6]">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-[#A1A1A6] transition-colors group-focus-within:text-cyan-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                  className="w-full rounded-xl py-3 pl-11 pr-12 text-sm outline-none transition-all duration-200 bg-white/5 border border-cyan-400/10 text-white placeholder:text-[#A1A1A6]/60 focus-glow focus:border-cyan-400/40 focus:bg-white/[0.07]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-3.5 text-[#A1A1A6] hover:text-cyan-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-xs flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" /> {errors.password.message?.toString()}
                </p>
              )}

              {password.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#A1A1A6]">Password Strength</span>
                    <span className="text-xs font-medium" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: strength.color }}
                      initial={{ width: 0 }}
                      animate={{ width: strength.width }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <PremiumButton
                type="submit"
                disabled={isLoading || isTransitioning || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                isLoading={isLoading || isTransitioning}
                variant="primary"
                size="lg"
                fullWidth
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isTransitioning ? 'Launching MITRA...' : isLoading ? 'Authenticating...' : 'Enter MITRA'}
              </PremiumButton>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6 border-t border-white/10"
          >
            <div className="flex items-center justify-center gap-4 text-xs text-[#A1A1A6]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Secure Connection
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                v3.2.0
              </span>
            </div>
          </motion.div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function LaunchSequence({
  phase,
  startRect,
}: {
  phase: TransitionPhase;
  startRect: DOMRect | null;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === 'done') {
      navigate('/dashboard', { replace: true });
    }
  }, [phase, navigate]);

  const startCenterX = startRect ? startRect.left + startRect.width / 2 : window.innerWidth * 0.3;
  const startCenterY = startRect ? startRect.top + startRect.height / 2 : window.innerHeight * 0.5;
  const targetX = window.innerWidth - 160;
  const targetY = 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Fade to dashboard color */}
      <motion.div
        className="absolute inset-0 bg-[#050D18]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'launch' ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Success text */}
      <motion.div
        className="absolute z-20 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: phase === 'success' ? 1 : 0,
          scale: phase === 'success' ? 1 : 0.9,
        }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(100, 255, 218, 0.2) 0%, rgba(0, 180, 216, 0.15) 100%)',
            border: '1px solid rgba(100, 255, 218, 0.4)',
            boxShadow: '0 0 40px rgba(100, 255, 218, 0.3)',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Activity className="w-8 h-8 text-cyan-300" />
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">Access Granted</h2>
        <p className="text-[#A1A1A6]">Initializing your command center...</p>
      </motion.div>

      {/* Flying robot */}
      <motion.div
        className="absolute z-30 w-[520px] h-[420px]"
        initial={{
          x: startCenterX - 260,
          y: startCenterY - 210,
          scale: 1,
          opacity: 1,
        }}
        animate={{
          x: phase === 'launch' ? targetX : startCenterX - 260,
          y: phase === 'launch' ? targetY : startCenterY - 210,
          scale: phase === 'launch' ? 0.22 : 1,
          opacity: phase === 'done' ? 0 : 1,
        }}
        transition={{
          duration: 1.4,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <RobotCanvas
          state="success"
          emotion="happy"
          gesture="celebrate"
          speaking={false}
          mouthOpen={0.2}
          physics={{ floatSpeed: 2.5, floatAmplitude: 0.15, docked: false }}
        />
        {/* Trail effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(100, 255, 218, 0.2) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const [mousePos, setMousePos] = useState<MousePos>({ x: 0.5, y: 0.5 });
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const robotRef = useRef<HTMLDivElement>(null);
  const [robotRect, setRobotRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setMousePos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = useCallback(async (data: LoginFormData) => {
    if (robotRef.current) {
      setRobotRect(robotRef.current.getBoundingClientRect());
    }

    await login(data.email.trim().toLowerCase(), data.password, { redirectTo: null });
    toast.success('Access granted');

    // Launch sequence
    setPhase('success');
    setTimeout(() => setPhase('launch'), 900);
    setTimeout(() => setPhase('done'), 2400);
  }, [login]);

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#050D18]">
      <AuroraBackground intensity="medium" />

      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="login-content"
            className="flex w-full min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <HeroSection mousePos={mousePos} onRobotRef={el => { (robotRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }} />
            <LoginForm isTransitioning={phase !== 'idle'} onSubmit={handleLogin} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== 'idle' && (
        <LaunchSequence phase={phase} startRect={robotRect} />
      )}
    </div>
  );
}
