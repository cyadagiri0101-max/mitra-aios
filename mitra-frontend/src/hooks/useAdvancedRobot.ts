import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { phonemeEngine, type PhonemeData } from '../core/robot-engine/PhonemeEngine';
import { voiceEmotionAnalyzer } from '../core/robot-engine/VoiceEmotionAnalyzer';
import { gesturePlanningEngine } from '../core/robot-engine/GesturePlanningEngine';
import { motionPhysicsEngine } from '../core/robot-engine/MotionPhysicsEngine';
import { spatialAudioEngine } from '../core/robot-engine/SpatialAudioEngine';
import { audioEngine } from '../core/robot-engine/AudioEngine';
import { useRobotStore } from '../store/robot.store';
import { RobotEmotion } from '../types/robot.types';

export interface UseAdvancedRobotOptions {
  enablePhonemeSync?: boolean;
  enableEmotionDetection?: boolean;
  enableGesturePlanning?: boolean;
  enablePhysics?: boolean;
  enableSpatialAudio?: boolean;
  audioElement?: HTMLAudioElement | null;
  cameraRef?: React.RefObject<THREE.Camera>;
  robotMeshRef?: React.RefObject<THREE.Mesh>;
}

export function useAdvancedRobot({
  enablePhonemeSync = true,
  enableEmotionDetection = true,
  enableGesturePlanning = true,
  enablePhysics = true,
  enableSpatialAudio = true,
  audioElement,
  cameraRef,
  robotMeshRef,
}: UseAdvancedRobotOptions = {}) {
  const analysisIntervalRef = useRef<number | null>(null);
  const physicsFrameRef = useRef<number | null>(null);
  const emotionRef = useRef<RobotEmotion>('neutral');

  const setEmotion = useRobotStore((s) => s.setEmotion);
  const setGesture = useRobotStore((s) => s.setGesture);

  // Initialize spatial audio on first render
  useEffect(() => {
    if (enableSpatialAudio && cameraRef?.current && !spatialAudioEngine.getListener()) {
      spatialAudioEngine.initializeListener(cameraRef.current);
    }

    return () => {
      if (!enableSpatialAudio) return;
      spatialAudioEngine.dispose();
    };
  }, [enableSpatialAudio, cameraRef]);

  // Setup audio element analysis
  useEffect(() => {
    if (!audioElement) return;

    // Connect audio engine to element
    if (enablePhonemeSync || enableEmotionDetection) {
      audioEngine.attachToTTS(audioElement);
    }

    return () => {
      audioEngine.destroy();
    };
  }, [audioElement, enablePhonemeSync, enableEmotionDetection]);

  // Audio analysis loop
  useEffect(() => {
    if (!enablePhonemeSync && !enableEmotionDetection) return;

    const analyzeAudio = () => {
      const frequencyData = audioEngine.getByteFrequencyData();
      if (!frequencyData) {
        analysisIntervalRef.current = requestAnimationFrame(analyzeAudio);
        return;
      }

      // Phoneme detection
      if (enablePhonemeSync && robotMeshRef?.current) {
        const phoneme = phonemeEngine.analyzeAudioFrequencies(frequencyData);
        const audioIntensity = audioEngine.getAmplitude();

        phonemeEngine.applyMorphTargets(
          robotMeshRef.current,
          phoneme,
          emotionRef.current,
          audioIntensity,
        );
      }

      // Emotion detection from voice tone
      if (enableEmotionDetection) {
        const features = voiceEmotionAnalyzer.analyzeAudioFeatures(frequencyData);
        const analysis = voiceEmotionAnalyzer.detectEmotionFromFeatures(features);

        // Update emotion if confidence is high enough
        if (analysis.confidence > 0.6) {
          emotionRef.current = analysis.emotion;
          setEmotion(analysis.emotion);
        }
      }

      analysisIntervalRef.current = requestAnimationFrame(analyzeAudio);
    };

    analysisIntervalRef.current = requestAnimationFrame(analyzeAudio);

    return () => {
      if (analysisIntervalRef.current !== null) {
        cancelAnimationFrame(analysisIntervalRef.current);
      }
    };
  }, [enablePhonemeSync, enableEmotionDetection, robotMeshRef, setEmotion]);

  // Physics simulation loop
  useEffect(() => {
    if (!enablePhysics) return;

    let lastTime = Date.now();

    const updatePhysics = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;

      const motionState = motionPhysicsEngine.update(deltaTime);

      // Apply motion to robot mesh
      if (robotMeshRef?.current) {
        robotMeshRef.current.position.copy(motionState.position);
        robotMeshRef.current.rotation.order = 'YXZ';
        robotMeshRef.current.rotation.x = motionState.rotation.x;
        robotMeshRef.current.rotation.y = motionState.rotation.y;
        robotMeshRef.current.rotation.z = motionState.rotation.z;
      }

      physicsFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    physicsFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (physicsFrameRef.current !== null) {
        cancelAnimationFrame(physicsFrameRef.current);
      }
    };
  }, [enablePhysics, robotMeshRef]);

  // Handle mouse tracking for eye and head movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enablePhysics) return;

      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      motionPhysicsEngine.setMousePosition(x, y);
    },
    [enablePhysics],
  );

  useEffect(() => {
    if (!enablePhysics) return;

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enablePhysics, handleMouseMove]);

  // Gesture planning integration
  const planGesture = useCallback(
    (userMessage: string, aiResponse: string) => {
      if (!enableGesturePlanning) return;

      const context = {
        userMessage,
        aiResponse,
        emotion: emotionRef.current,
        confidence: 0.85, // Default confidence
      };

      const plan = gesturePlanningEngine.planGesture(context);
      setGesture(plan.gesture);

      // Auto-reset gesture after duration
      setTimeout(() => {
        setGesture('idle');
      }, plan.duration * 1000);
    },
    [enableGesturePlanning, setGesture],
  );

  // Public API for controlling robot
  const controls = {
    planGesture,
    setPhonemes: (phonemes: PhonemeData[]) => {
      phonemeEngine.queuePhonemes(phonemes);
    },
    setEmotion: (emotion: RobotEmotion) => {
      emotionRef.current = emotion;
      setEmotion(emotion);
    },
    setAudioPosition: (position: THREE.Vector3) => {
      if (enableSpatialAudio) {
        spatialAudioEngine.setAudioPosition('voice', position);
      }
    },
    applyForce: (force: THREE.Vector3) => {
      if (enablePhysics) {
        motionPhysicsEngine.applyForce(force);
      }
    },
    getPhysicsState: () => enablePhysics ? motionPhysicsEngine.getMotionState() : null,
    getEmotionAnalysis: (frequencyData: Uint8Array) => {
      return enableEmotionDetection ? voiceEmotionAnalyzer.analyzeAudioFeatures(frequencyData) : null;
    },
  };

  return controls;
}
