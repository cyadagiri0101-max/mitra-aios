# MITRA Advanced Robot Assistant - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd mitra-frontend
npm install --legacy-peer-deps
```

All required dependencies are already in `package.json`:
- `@react-three/fiber` - 3D rendering
- `@react-three/drei` - 3D utilities
- `@react-three/postprocessing` - Visual effects
- `three` - WebGL library
- `socket.io-client` - Real-time sync

### 2. Create Robot Component

```tsx
// src/components/Robot/EnhancedRobotAssistant.tsx
import { Canvas } from '@react-three/fiber';
import { useAdvancedRobot } from '@/hooks/useAdvancedRobot';
import { AdvancedCinematicEffects } from './AdvancedCinematicEffects';
import RobotModel from './RobotModel';

export function EnhancedRobotAssistant() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraRef = useRef<THREE.Camera>(null);
  const robotMeshRef = useRef<THREE.Mesh>(null);

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
    <div className="relative w-full h-screen">
      <Canvas camera={cameraRef} ref={cameraRef}>
        <RobotModel ref={robotMeshRef} />
        <AdvancedCinematicEffects preset="holographic" />
      </Canvas>
      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  );
}
```

### 3. Handle AI Response with Robot Sync

```tsx
// Example: In your chat component
import { handleTTSWithPhonemes, requestTTSWithPhonemes } from '@/services/RobotIntegration';

async function handleAIResponse(aiMessage: string) {
  // 1. Get TTS with phoneme data from backend
  const ttsData = await requestTTSWithPhonemes(
    aiMessage,
    process.env.REACT_APP_API_URL
  );

  if (!ttsData) return;

  // 2. Plan gesture based on response
  robotControls.planGesture(userMessage, aiMessage);

  // 3. Play TTS with phoneme sync
  await handleTTSWithPhonemes(ttsData, audioElement);
}
```

### 4. Connect to Backend

Update your `.env`:
```env
REACT_APP_API_URL=https://your-backend-api.com
REACT_APP_ENABLE_ROBOT=true
REACT_APP_ROBOT_PRESET=holographic
```

### 5. Test It

```bash
npm run dev
# Visit http://localhost:3000
```

---

## Core Systems Overview

### Audio Analysis
```
User speaks/TTS plays
        ↓
Audio frequency data captured
        ↓
Emotion detected + Phonemes classified
        ↓
Mouth animates + Robot reacts
```

### Gesture Planning
```
User message + AI response
        ↓
Intent extracted + Emotion analyzed
        ↓
Gesture selected + Intensity calculated
        ↓
Gesture animation plays
```

### Physics Motion
```
Base pose + Hovering
        ↓
Breathing animation
        ↓
Head lag from camera tracking
        ↓
Eye tracking follows mouse
        ↓
Natural, lifelike motion
```

---

## Key APIs

### 1. Trigger Gesture
```typescript
robotControls.planGesture(userMessage, aiMessage);
// Automatically selects gesture based on context
```

### 2. Set Emotion
```typescript
robotControls.setEmotion('happy');
// Options: happy, excited, concerned, thinking, warning, danger, success, sleepy, neutral
```

### 3. Apply Physical Force
```typescript
robotControls.applyForce(new THREE.Vector3(0, 10, 0));
// For physics-based reactions
```

### 4. Queue Phoneme Data
```typescript
robotControls.setPhonemes([
  { phoneme: 'A', time: 0.12, duration: 0.1, confidence: 0.95 }
]);
// For manual lip sync control
```

---

## Common Scenarios

### Scenario 1: Simple Chat Response
```typescript
// Backend returns TTS with phonemes
const response = await fetch('/api/tts/with-phonemes', {
  method: 'POST',
  body: JSON.stringify({ text: aiMessage })
});

const { audioUrl, phonemes } = await response.json();

// Frontend handles it
robotControls.planGesture(userMsg, aiMessage);
await handleTTSWithPhonemes({ audioUrl, phonemes }, audioElement);
```

### Scenario 2: Long Presentation
```typescript
// For longer responses, backend returns multiple gestures
const gestureData = await fetch('/api/ai/plan-gesture', {
  method: 'POST',
  body: JSON.stringify({
    userMessage: "Show me the report",
    aiResponse: longReportText,
    emotion: 'thinking',
    includeSequence: true
  })
});

const { gestures } = await gestureData.json();
// Robot executes gesture sequence automatically
```

### Scenario 3: Real-time Emotion Detection
```typescript
// As user speaks, detect emotion from voice
const emotionData = await fetch('/api/ai/analyze-emotion', {
  method: 'POST',
  body: JSON.stringify({
    frequencyData: audioFrequencies,
    sessionId: currentSession
  })
});

const { emotion, intensity } = await emotionData.json();
robotControls.setEmotion(emotion);
```

---

## Configuration

### Cinematic Effects Presets
```typescript
// Holographic (default - sci-fi look)
<AdvancedCinematicEffects preset="holographic" />

// Cinematic (realistic)
<AdvancedCinematicEffects preset="cinematic" />

// Film Noir (classic film look)
<AdvancedCinematicEffects preset="filmNoir" />

// Studio (clean professional)
<AdvancedCinematicEffects preset="studio" />

// Minimal (performance mode)
<AdvancedCinematicEffects preset="minimal" />
```

### Physics Configuration
```typescript
const controls = useAdvancedRobot({
  // ...
});

// Customize physics behavior
motionPhysicsEngine.setConfig({
  hoverHeight: 0.05,      // Bobbing height
  hoverSpeed: 0.002,      // Bobbing speed
  breathingAmplitude: 0.02, // Chest expansion
  headLagFactor: 0.08,    // Secondary motion lag
});
```

---

## Performance Tips

### 1. Enable/Disable Systems Based on Device
```typescript
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

const controls = useAdvancedRobot({
  enablePhonemeSync: !isMobile,
  enablePhysics: !isMobile,
  enableSpatialAudio: !isMobile,
  enableEmotionDetection: true, // Always enable
  enableGesturePlanning: true,  // Always enable
});
```

### 2. Cache TTS Results
```typescript
const ttsCache = new Map<string, TTSData>();

async function getCachedTTS(text: string) {
  if (ttsCache.has(text)) {
    return ttsCache.get(text);
  }

  const data = await requestTTSWithPhonemes(text, apiUrl);
  ttsCache.set(text, data);
  return data;
}
```

### 3. Throttle Gesture Updates
```typescript
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 500; // ms

function handleGesture(userMsg: string, aiMsg: string) {
  if (Date.now() - lastGestureTime > GESTURE_COOLDOWN) {
    robotControls.planGesture(userMsg, aiMsg);
    lastGestureTime = Date.now();
  }
}
```

### 4. Use Appropriate Preset for Device
```typescript
const effectsPreset = isMobile ? 'minimal' : 'holographic';

<AdvancedCinematicEffects
  preset={effectsPreset}
  emotionIntensity={0.7}
/>
```

---

## Debugging

### Check Robot Model
```typescript
// Verify GLB model is loaded
useGLTF('/robot.glb');
// Should be at public/robot.glb

// Check morphtargets
if (mesh.morphTargetInfluences) {
  console.log(`Morphtargets available: ${mesh.morphTargetInfluences.length}`);
}
```

### Monitor Audio Analysis
```typescript
import { audioEngine } from '@/core/robot-engine/AudioEngine';

// In your update loop
const intensity = audioEngine.getAmplitude();
const frequencyData = audioEngine.getByteFrequencyData();
console.log(`Audio intensity: ${intensity}`);
console.log(`Peak frequency bin: ${Math.max(...frequencyData)}`);
```

### Test Gesture Planning
```typescript
import { gesturePlanningEngine } from '@/core/robot-engine/GesturePlanningEngine';

const plan = gesturePlanningEngine.planGesture({
  userMessage: 'Show me the report',
  aiResponse: 'Here is the Q3 report analysis',
  emotion: 'thinking',
  confidence: 0.85
});

console.log(`Planned gesture: ${plan.gesture}`);
console.log(`Intensity: ${plan.intensity}`);
console.log(`Duration: ${plan.duration}s`);
```

### Monitor Physics
```typescript
import { motionPhysicsEngine } from '@/core/robot-engine/MotionPhysicsEngine';

const motionState = motionPhysicsEngine.getMotionState();
console.log('Position:', motionState.position);
console.log('Rotation:', motionState.rotation);
console.log('Velocity:', motionState.velocity);
```

---

## Troubleshooting

### Problem: Phoneme sync is delayed
**Solution:** Check backend phoneme timing accuracy
```typescript
// Log phoneme data
console.log(ttsData.phonemes);
// Verify timing is within ±10ms accuracy
```

### Problem: Robot looks stiff
**Solution:** Increase physics damping and enable all motion systems
```typescript
motionPhysicsEngine.setConfig({
  damping: 0.92,        // Lower = bouncier
  hoverAmplitude: 0.05, // Increase bobbing
  breathingAmplitude: 0.03, // More breathing
});
```

### Problem: Gestures don't look right
**Solution:** Verify animation clips in GLB model
```typescript
const { animations } = useGLTF('/robot.glb');
console.log('Available animations:', animations.map(a => a.name));
```

### Problem: Audio not 3D positioned
**Solution:** Verify spatial audio initialization
```typescript
spatialAudioEngine.initializeListener(camera);
// Verify with headphones - should hear directional sound
```

---

## Next Steps

1. ✅ Set up components (done)
2. 🔄 Implement backend API endpoints
3. 🔄 Create/optimize 3D robot model with morphtargets
4. 🔄 Test with real TTS data
5. 🔄 Optimize for target devices
6. 🔄 Deploy to production

---

## Support & Resources

- **Advanced System Details**: See `ADVANCED_ROBOT_SYSTEM.md`
- **Backend API Specs**: See `BACKEND_API_SPECIFICATION.md`
- **React Three Fiber Docs**: https://docs.pmnd.rs/react-three-fiber/
- **Three.js Examples**: https://threejs.org/examples/
- **Web Audio Basics**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## Team Contacts

- **Frontend Lead**: (add contact)
- **Backend Lead**: (add contact)
- **3D Modeling**: (add contact)
- **DevOps**: (add contact)

