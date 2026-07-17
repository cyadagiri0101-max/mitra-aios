# MITRA Advanced AI Robot Assistant - Implementation Guide

## Overview

This document covers the Pixar-level AI robot assistant system implemented in MITRA 3.0. The system includes:

- **Phoneme-based lip sync** (Hollywood-grade)
- **Voice tone emotion detection** (ML-powered)
- **AI-driven gesture planning** (LLM-powered)
- **Physics-based motion** (natural secondary motion)
- **Cinematic visual effects** (WebGL post-processing)
- **3D spatial audio** (positional sound)
- **Real-time synchronization** (multi-user support)

---

## Core Systems

### 1. Phoneme Engine (`PhonemeEngine.ts`)

Converts audio frequency data into phoneme recognition and applies morphtarget blending for lip sync.

**Features:**
- Frequency analysis → phoneme classification
- Viseme-to-morphtarget mapping (14+ facial shapes)
- Emotion-based blending (happy smile, concerned frown, etc.)
- Real-time smoothing and intensity calculation

**Phoneme Map:**
```
A → mouth_open (A, O sounds)
E → mouth_wide (E, I sounds)
M → mouth_closed (M, P, B sounds)
S → teeth_close (S, Z sounds)
TH → tongue_out (TH sounds)
... (total 14 phonemes)
```

**Usage:**
```typescript
import { phonemeEngine } from '@/core/robot-engine/PhonemeEngine';

// Analyze audio frequencies
const phoneme = phonemeEngine.analyzeAudioFrequencies(frequencyData);

// Apply to mesh morphtargets
phonemeEngine.applyMorphTargets(mesh, phoneme, emotion, audioIntensity);
```

---

### 2. Voice Emotion Analyzer (`VoiceEmotionAnalyzer.ts`)

Detects emotional state from voice tone using audio feature analysis.

**Audio Features:**
- **Pitch** (fundamental frequency)
- **Energy** (loudness/RMS)
- **Spectral Centroid** (frequency distribution)
- **Zero Crossing Rate** (high-frequency content)
- **Variance** (stability/confidence)

**Emotion Classification:**
```
Happy: High pitch, high energy, low variance
Excited: Very high pitch, max energy, moderate variance
Concerned: Low-medium pitch, medium energy, medium variance
Thinking: Moderate pitch, moderate energy, medium variance
Danger: Any pitch, high energy, high variance
Sleepy: Low pitch, low energy, low variance
```

**Usage:**
```typescript
import { voiceEmotionAnalyzer } from '@/core/robot-engine/VoiceEmotionAnalyzer';

const features = voiceEmotionAnalyzer.analyzeAudioFeatures(frequencyData);
const analysis = voiceEmotionAnalyzer.detectEmotionFromFeatures(features);
// analysis.emotion: RobotEmotion
// analysis.confidence: 0-1
// analysis.intensity: 0-1
```

---

### 3. Gesture Planning Engine (`GesturePlanningEngine.ts`)

Uses NLP to extract intent and emotion from conversation, then selects appropriate gestures.

**Intent Types:**
- `greeting`: wave, nod
- `explanation`: point, explain
- `agreement`: nod, celebrate
- `uncertainty`: think
- `success`: celebrate, wave
- `error`: alert, shake
- `presenting`: present, point

**Emotion-based Modifications:**
- Happy/Excited: Prioritize celebratory gestures
- Concerned/Thinking: Prioritize thoughtful gestures
- Warning/Danger: Prioritize alert gestures

**Usage:**
```typescript
import { gesturePlanningEngine } from '@/core/robot-engine/GesturePlanningEngine';

const plan = gesturePlanningEngine.planGesture({
  userMessage: "Can you show me the report?",
  aiResponse: "I'll present the Q3 report analysis...",
  emotion: 'thinking',
  confidence: 0.85,
});
// plan.gesture: 'present'
// plan.intensity: 0.7
// plan.duration: 1.8
```

---

### 4. Motion Physics Engine (`MotionPhysicsEngine.ts`)

Simulates realistic motion with physics-based secondary effects.

**Features:**
- **Hovering**: Smooth up-down bobbing
- **Breathing**: Subtle scale expansion/contraction
- **Head Lag**: Secondary motion following camera/mouse
- **Eye Tracking**: Binocular gaze following
- **Blinking**: Random realistic eye closure
- **Physics**: Force/torque application with damping

**Configuration:**
```typescript
const config = {
  gravity: -0.098,           // Natural gravity
  damping: 0.95,             // Velocity damping
  hoverHeight: 0.05,         // Bobbing amplitude
  hoverSpeed: 0.002,         // Bobbing frequency
  headLagFactor: 0.08,       // Secondary motion lag
  breathingAmplitude: 0.02,  // Chest expansion
  breathingSpeed: 0.0015,    // Breathing frequency
};
```

**Usage:**
```typescript
import { motionPhysicsEngine } from '@/core/robot-engine/MotionPhysicsEngine';

const motionState = motionPhysicsEngine.update(deltaTime);
mesh.position.copy(motionState.position);
mesh.rotation.setFromEuler(motionState.rotation);

// Apply forces
motionPhysicsEngine.applyForce(new THREE.Vector3(0, 10, 0));
```

---

### 5. Spatial Audio Engine (`SpatialAudioEngine.ts`)

Creates 3D positional audio with HRTF rendering.

**Features:**
- 3D sound positioning (sounds move with robot)
- Distance attenuation (volume decreases with distance)
- HRTF binaural rendering (realistic spatial effects)
- Directional audio (sounds come from specific direction)

**Usage:**
```typescript
import { spatialAudioEngine } from '@/core/robot-engine/SpatialAudioEngine';

// Initialize with camera listener
spatialAudioEngine.initializeListener(camera);

// Create positioned audio
const audio = spatialAudioEngine.createAudioSource('voice', {
  url: '/voice.mp3',
  position: new THREE.Vector3(0, 1.5, 0),
  volume: 0.8,
  distance: 5,
});

// Play positioned sound
spatialAudioEngine.playAudio('voice');
```

---

### 6. Cinematic Effects (`AdvancedCinematicEffects.tsx`)

Post-processing effects pipeline for AAA game-level visuals.

**Presets:**
- `cinematic`: Maximum realism (Bloom 2.5, DOF, Vignette)
- `holographic`: Sci-fi neon theme (Bloom 3.2, CA, high grain)
- `filmNoir`: Classic film look (Bloom 1.2, high grain, DOF)
- `studio`: Clean professional (Bloom 1.5, minimal effects)
- `minimal`: Light performance mode (minimal effects)

**Effects:**
- **Bloom**: Glow on bright areas
- **Depth of Field**: Focal blur for depth
- **Noise**: Film grain for realism
- **Vignette**: Darkened edges for focus
- **Chromatic Aberration**: Color fringing (sci-fi look)

**Usage:**
```typescript
<AdvancedCinematicEffects
  preset="holographic"
  emotionIntensity={0.8}
  config={{
    bloomIntensity: 3.2,
    bloomThreshold: 0.1,
  }}
/>
```

---

### 7. Advanced Robot Hook (`useAdvancedRobot.ts`)

Orchestrates all systems with a unified React hook.

**Features:**
- Real-time audio analysis (phoneme + emotion)
- Physics simulation
- Gesture planning
- Spatial audio control
- Mouse tracking

**Usage:**
```typescript
const controls = useAdvancedRobot({
  enablePhonemeSync: true,
  enableEmotionDetection: true,
  enableGesturePlanning: true,
  enablePhysics: true,
  enableSpatialAudio: true,
  audioElement: audioRef.current,
  cameraRef,
  robotMeshRef,
});

// Use controls
controls.planGesture(userMessage, aiResponse);
controls.setEmotion('happy');
controls.applyForce(new THREE.Vector3(0, 5, 0));
```

---

## Integration with Backend

### 1. TTS with Phonemes

**Request:**
```bash
POST /api/tts/with-phonemes
{
  "text": "Hello, world!",
  "language": "en",
  "speaker": "default",
  "includePhonemes": true
}
```

**Response:**
```json
{
  "text": "Hello, world!",
  "audioUrl": "https://api.example.com/speech/abc123.mp3",
  "phonemes": [
    {
      "phoneme": "A",
      "time": 0.12,
      "duration": 0.1,
      "confidence": 0.95
    },
    {
      "phoneme": "O",
      "time": 0.22,
      "duration": 0.15,
      "confidence": 0.93
    }
  ],
  "duration": 2.5
}
```

**Frontend Usage:**
```typescript
import { handleTTSWithPhonemes, requestTTSWithPhonemes } from '@/services/RobotIntegration';

const ttsData = await requestTTSWithPhonemes(
  "Hello, world!",
  "https://api.example.com"
);

if (ttsData) {
  await handleTTSWithPhonemes(ttsData, audioElement);
}
```

### 2. Emotion Analysis

**Request:**
```bash
POST /api/ai/analyze-emotion
{
  "frequency": [12, 34, 56, ...],
  "timeDomain": [128, 130, 125, ...],
  "timestamp": 1698765432000
}
```

**Response:**
```json
{
  "text": "Detected emotion",
  "voiceTone": "positive",
  "confidence": 0.87
}
```

### 3. Gesture Planning

**Request:**
```bash
POST /api/ai/plan-gesture
{
  "userMessage": "Can you explain that?",
  "aiResponse": "Of course! Let me break it down...",
  "emotion": "thinking",
  "includeSequence": true
}
```

**Response:**
```json
{
  "userMessage": "Can you explain that?",
  "aiResponse": "Of course! Let me break it down...",
  "emotion": "thinking",
  "gestures": ["point", "present", "nod"]
}
```

---

## Component Integration

### Enhanced RobotCanvas Component

```typescript
import { useAdvancedRobot } from '@/hooks/useAdvancedRobot';
import { AdvancedCinematicEffects } from './AdvancedCinematicEffects';

export function EnhancedRobotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const robotMeshRef = useRef<THREE.Mesh>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const robotControls = useAdvancedRobot({
    enablePhonemeSync: true,
    enableEmotionDetection: true,
    enableGesturePlanning: true,
    enablePhysics: true,
    enableSpatialAudio: true,
    audioElement: audioRef.current,
    cameraRef,
    robotMeshRef,
  });

  return (
    <>
      <Canvas ref={canvasRef} camera={cameraRef}>
        <RobotModel ref={robotMeshRef} />
        <AdvancedCinematicEffects preset="holographic" />
      </Canvas>
      <audio ref={audioRef} crossOrigin="anonymous" />
    </>
  );
}
```

---

## Performance Optimization

### 1. Level-of-Detail (LOD)

For mobile/lower-end devices, disable expensive effects:

```typescript
<AdvancedCinematicEffects
  preset={device === 'mobile' ? 'minimal' : 'cinematic'}
  config={{
    bloomIntensity: device === 'mobile' ? 1.0 : 2.5,
  }}
/>
```

### 2. Gesture Planning Optimization

Throttle gesture updates:
```typescript
let lastGestureTime = 0;
const gestureCooldown = 500; // ms

if (Date.now() - lastGestureTime > gestureCooldown) {
  robotControls.planGesture(userMsg, aiMsg);
  lastGestureTime = Date.now();
}
```

### 3. Physics Simulation

Use adaptive timestep:
```typescript
const maxDeltaTime = 0.016 * 3; // 3 frames max
motionPhysicsEngine.update(Math.min(deltaTime, maxDeltaTime));
```

---

## Testing

### Unit Tests

```typescript
describe('PhonemeEngine', () => {
  it('should classify frequencies correctly', () => {
    const freq = new Uint8Array([10, 20, 30, 40]);
    const phoneme = phonemeEngine.analyzeAudioFrequencies(freq);
    expect(phoneme).toBeDefined();
  });
});

describe('VoiceEmotionAnalyzer', () => {
  it('should detect happy emotion from high pitch', () => {
    const features = {
      pitch: 280,
      energy: 0.7,
      variance: 0.08,
      tempo: 140,
      spectralCentroid: 2000,
      zeroCrossingRate: 0.3,
    };
    const analysis = voiceEmotionAnalyzer.detectEmotionFromFeatures(features);
    expect(analysis.emotion).toBe('happy');
  });
});
```

---

## Deployment Checklist

- [ ] Test phoneme sync with TTS
- [ ] Verify emotion detection accuracy
- [ ] Test gesture planning with various inputs
- [ ] Profile physics simulation performance
- [ ] Test spatial audio in various environments
- [ ] Optimize assets (GLB model, audio files)
- [ ] Setup CDN for static assets
- [ ] Configure backend API endpoints
- [ ] Setup error logging and monitoring
- [ ] Test on mobile devices

---

## Future Enhancements

1. **ML-based emotion detection**: Use TensorFlow.js for deeper emotion analysis
2. **Face expressions**: Add 50+ blendshapes for micro-expressions
3. **WebXR AR support**: Place robot in real world with @react-three/xr
4. **Multi-agent system**: Multiple robots with different personalities
5. **Unreal Engine rendering**: Migration to WebGPU for next-level graphics
6. **Speech-to-text integration**: Real-time speech recognition
7. **Gesture generation**: AI-driven pose generation for custom gestures
8. **Multiplayer**: Real-time sync of robot state across users

---

## Troubleshooting

### Phoneme sync is out of sync
- Check audio latency: `audioContext.currentTime` vs animation frame time
- Verify phoneme timing from backend is accurate
- Increase morphtarget smoothing

### Emotion detection is inaccurate
- Increase frequency resolution (fftSize)
- Collect more training data
- Adjust emotion threshold values

### Physics looks jittery
- Increase damping factor
- Use fixed timestep instead of variable
- Reduce head lag factor

### Spatial audio not working
- Verify AudioContext initialized
- Check HRTF support (works better in headphones)
- Test in supported browsers (Chrome, Firefox)

---

## Resources

- Three.js Documentation: https://threejs.org/docs/
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- Postprocessing Effects: https://github.com/vanruesc/postprocessing
- HRTF Audio: https://en.wikipedia.org/wiki/Head-related_transfer_function

