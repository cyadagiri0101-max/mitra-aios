import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { robotEvents } from '../../events/robot.events';
import { useLipSync } from '../../hooks/useLipSync';
import { useRobotStore } from '../../store/robot.store';
import { RobotCanvas } from './RobotCanvas';

interface RobotAssistantProps {
  className?: string;
  compact?: boolean;
}

export function RobotAssistant({ className = '', compact = false }: RobotAssistantProps) {
  const state = useRobotStore(s => s.state);
  const emotion = useRobotStore(s => s.emotion);
  const gesture = useRobotStore(s => s.gesture);
  const speaking = useRobotStore(s => s.speaking);
  const listening = useRobotStore(s => s.listening);
  const lastResponse = useRobotStore(s => s.lastResponse);
  const physics = useRobotStore(s => s.physics);
  const setState = useRobotStore(s => s.setState);
  const setEmotion = useRobotStore(s => s.setEmotion);
  const setGesture = useRobotStore(s => s.setGesture);
  const setSpeaking = useRobotStore(s => s.setSpeaking);
  const setListening = useRobotStore(s => s.setListening);
  const setDocked = useRobotStore(s => s.setDocked);
  const mouthOpen = useLipSync(speaking || state === 'speaking', lastResponse);

  useEffect(() => {
    const unsubscribe = [
      robotEvents.on('robot:stateChange', payload => payload.state && setState(payload.state)),
      robotEvents.on('robot:emotionChange', payload => payload.emotion && setEmotion(payload.emotion)),
      robotEvents.on('robot:gesture', payload => payload.gesture && setGesture(payload.gesture)),
      robotEvents.on('robot:speakStart', () => {
        setState('speaking');
        setSpeaking(true);
      }),
      robotEvents.on('robot:speakEnd', () => {
        setSpeaking(false);
        setState('idle');
      }),
      robotEvents.on('robot:listenStart', () => {
        setListening(true);
        setState('listening');
        setGesture('scan');
      }),
      robotEvents.on('robot:listenEnd', () => {
        setListening(false);
        setState('idle');
      }),
      robotEvents.on('robot:dock', () => setDocked(true)),
      robotEvents.on('robot:undock', () => setDocked(false)),
      robotEvents.on('robot:alert', () => {
        setState('alert');
        setEmotion('danger');
        setGesture('alert');
      }),
    ];

    return () => unsubscribe.forEach(item => item());
  }, [setDocked, setEmotion, setGesture, setListening, setSpeaking, setState]);

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: listening ? 1.02 : 1,
        filter: speaking ? 'drop-shadow(0 0 22px rgba(100, 255, 218, 0.34))' : 'drop-shadow(0 0 14px rgba(0, 180, 216, 0.22))',
      }}
      transition={{ duration: 0.35 }}
    >
      <RobotCanvas
        state={state}
        emotion={emotion}
        gesture={gesture}
        speaking={speaking}
        mouthOpen={mouthOpen}
        physics={physics}
        compact={compact}
      />
    </motion.div>
  );
}
