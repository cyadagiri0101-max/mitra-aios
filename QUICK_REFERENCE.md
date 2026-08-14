# Mitra Robot Assistant - Quick Reference Card

## 🚀 Quick Setup (5 minutes)

```typescript
import { useAdvancedRobot } from '@/hooks/useAdvancedRobot';
import { AdvancedCinematicEffects } from '@/components/Robot/AdvancedCinematicEffects';

export function RobotScene() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const robotMeshRef = useRef<THREE.Mesh>(null);

  const robot = useAdvancedRobot({
    enablePhonemeSync: true,
    enableEmotionDetection: true,
    enableGesturePlanning: true,
    enablePhysics: true,
    audioElement: audioRef.current,
    cameraRef,
    robotMeshRef,
  });

  return (
    <Canvas ref={cameraRef}>
      <AdvancedCinematicEffects preset="holographic" emotionIntensity={0.8} />
      {/* Robot mesh here */}
    </Canvas>
  );
}
```

---

## 🎨 Visual Presets

```typescript
// Available presets
<AdvancedCinematicEffects preset="cinematic" />     // Bloom 2.5, DOF
<AdvancedCinematicEffects preset="holographic" />   // Bloom 3.2, sci-fi
<AdvancedCinematicEffects preset="filmNoir" />      // Bloom 1.2, grain
<AdvancedCinematicEffects preset="studio" />        // Bloom 1.5, clean
<AdvancedCinematicEffects preset="minimal" />       // Bloom 1.0, mobile
```

---

## 🎭 Emotion System

```typescript
// 9 Emotions supported
"happy" | "excited" | "calm" | "concerned" | "angry" | "sad" | "thinking" | "neutral" | "sleepy"

// Get emotion from voice
const analysis = voiceEmotionAnalyzer.analyzeAudioFeatures(frequencyData);
console.log(analysis.emotion);      // "happy" | etc
console.log(analysis.confidence);   // 0.0 - 1.0
console.log(analysis.intensity);    // 0.0 - 1.0
```

---

## 🎵 Phoneme System

```typescript
// 14 Phoneme types
"A" | "E" | "I" | "O" | "U" | "M" | "F" | "V" | "TH" | "L" | "R" | "S" | "Z" | "SILENT"

// Analyze audio → get phoneme
const phoneme = phonemeEngine.analyzeAudioFrequencies(frequencyData);
console.log(phoneme.type);           // "A" | "E" | etc
console.log(phoneme.confidence);     // 0.0 - 1.0

// Apply to robot
phonemeEngine.applyMorphTargets(robotMesh, phoneme, emotion, intensity);
```

---

## 👋 Gesture System

```typescript
// 10 Gesture types
"wave" | "point" | "nod" | "shake" | "think" | "present" | "scan" | "alert" | "celebrate" | "idle"

// Plan gesture from conversation
const plan = gesturePlanningEngine.planGesture({
  userMessage: "Hey, can you help me?",
  aiResponse: "Of course! I'm happy to help.",
  emotion: "happy",
  confidence: 0.85
});

console.log(plan.gesture);           // "wave" | "point" | etc
console.log(plan.duration);          // Milliseconds
console.log(plan.intensity);         // 0.0 - 1.0
```

---

## 🎬 Physics Motion

```typescript
// In animation loop:
const motionState = motionPhysicsEngine.update(deltaTime);

// Apply to mesh
mesh.position.copy(motionState.position);     // Hovering motion
mesh.rotation.setFromEuler(motionState.rotation);  // Head lag

// Get eye tracking
const eyeRotation = motionPhysicsEngine.getEyeTracking(mousePosition);
eyeLookObject.rotation.copy(eyeRotation);

// Configure physics
motionPhysicsEngine.setConfig({
  hoveringAmplitude: 0.5,    // Default 0.3
  hoveringFrequency: 0.8,    // Default 1.0
  headLagFactor: 0.12,       // Default 0.08
  blinkInterval: 3000,       // Default 5000 ms
  breathingScale: 0.02,      // Default 0.01
});
```

---

## 🔊 Spatial Audio

```typescript
// Audio follows robot
spatialAudioEngine.playSound3D({
  audioBuffer: bufferData,
  position: new THREE.Vector3(0, 1.5, 0),  // Robot head
  distance: 10,                             // Attenuation distance
  volume: 0.8
});

// Listen to camera
spatialAudioEngine.setListenerPosition(camera.position);
spatialAudioEngine.setListenerOrientation(camera.getWorldDirection());
```

---

## 🌐 Backend Integration

```typescript
// Request TTS with phonemes
const ttsData = await requestTTSWithPhonemes(
  "Hello, how can I help?",
  "https://api.example.com"
);

// Apply to robot
phonemeEngine.queuePhonemes(ttsData.phonemes);
// Audio plays with auto lip-sync

// Detect emotion
const emotionResult = await sendAudioAnalysisToBackend(
  audioBuffer,
  "https://api.example.com"
);

// Plan gesture
const gesturePlan = await requestGesturePlan({
  userMessage: userMsg,
  aiResponse: aiMsg,
  apiUrl: "https://api.example.com"
});
```

---

## 📡 Event System

```typescript
// Listen for robot events
window.addEventListener('robot:phonemesReady', (e) => {
  console.log(e.detail); // { phonemes, duration }
});

window.addEventListener('robot:emotionAnalysis', (e) => {
  console.log(e.detail); // { emotion, confidence, intensity }
});

window.addEventListener('robot:gesturePlan', (e) => {
  console.log(e.detail); // { gesture, duration, intensity }
});
```

---

## 🔧 Configuration Examples

### Mobile Optimized
```typescript
useAdvancedRobot({
  enablePhonemeSync: false,       // Skip expensive analysis
  enableEmotionDetection: true,   // Still detect emotion
  enableGesturePlanning: true,
  enablePhysics: false,           // Disable hovering
  enableSpatialAudio: false,
});
```

### Maximum Quality (Desktop)
```typescript
useAdvancedRobot({
  enablePhonemeSync: true,
  enableEmotionDetection: true,
  enableGesturePlanning: true,
  enablePhysics: true,
  enableSpatialAudio: true,
  audioElement,
  cameraRef,
  robotMeshRef,
});
```

### Backend Offline Mode
```typescript
useAdvancedRobot({
  enablePhonemeSync: true,        // Client-side estimation
  enableEmotionDetection: true,   // Local analysis
  enableGesturePlanning: false,   // Needs backend
  enablePhysics: true,
});
```

---

## 🐛 Debugging

```typescript
// Enable debug logs in hook
const robot = useAdvancedRobot({
  // ... config
  debugMode: true  // Logs all events
});

// Check system status
console.log(robot.getPhysicsState());
console.log(robot.getCurrentEmotion());
console.log(robot.getLastGesture());
```

---

## ⚡ Performance Tips

| System | Speed | Cost | Tip |
|--------|-------|------|-----|
| Phoneme Sync | Real-time | 1-2ms | Disable on low-end devices |
| Emotion Detection | Real-time | 1-2ms | Sample every 100ms if needed |
| Gesture Planning | On-demand | <1ms | Batch requests |
| Physics | Per-frame | 1-2ms | Reduce quality on mobile |
| Spatial Audio | Per-frame | <1ms | Use mono on battery-low |
| Cinematic Effects | Per-frame | 2-5ms | Use minimal preset on mobile |

---

## 🎯 Common Tasks

### Play animation
```typescript
robot.planGesture("happy", "Hello!");
```

### Change emotion
```typescript
robot.setEmotion("excited", 0.9);
```

### Apply force (pushback)
```typescript
robot.applyForce(new THREE.Vector3(0, 0, -1), 0.5);
```

### Get current state
```typescript
const state = robot.getPhysicsState();
const emotion = robot.getCurrentEmotion();
```

### Batch requests
```typescript
import { batchProcessRobotRequests } from '@/services/RobotIntegration';

const results = await batchProcessRobotRequests([
  { type: 'tts', text: 'Hello' },
  { type: 'emotion', audio: buffer },
  { type: 'gesture', text: 'How are you?' }
]);
```

---

## 📦 Morphtarget Names (3D Model Required)

```
viseme_A, viseme_E, viseme_I, viseme_O, viseme_U,
viseme_M, viseme_F, viseme_V, viseme_TH, viseme_L,
viseme_R, viseme_S, viseme_Z, viseme_SILENT
```

Robot model must have these 14+ blendshapes for lip sync to work.

---

## 🔐 API Keys & Secrets

Store these in `.env.local`:
```
VITE_ROBOT_API_URL=https://api.example.com
VITE_TTS_API_KEY=xxx
VITE_LLM_API_KEY=xxx
```

Never commit secrets to git!

---

## 📚 Full Docs

- **Setup**: `ROBOT_QUICK_START.md`
- **Architecture**: `ADVANCED_ROBOT_SYSTEM.md`
- **APIs**: `BACKEND_API_SPECIFICATION.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: June 26, 2026
**Version**: 1.0 Production
**Status**: ✅ Ready to Deploy
