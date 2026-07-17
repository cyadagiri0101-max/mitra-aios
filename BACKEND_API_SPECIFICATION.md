# MITRA AI Robot Assistant - Backend API Specification

This document specifies the backend API endpoints required for the advanced AI robot assistant system.

## Overview

The backend needs to provide:
1. **TTS with phoneme timing** - Text-to-speech with phoneme-level timing data
2. **Emotion analysis** - Analyze voice tone and text for emotion detection
3. **Gesture planning** - LLM-based gesture planning based on conversation
4. **Real-time state sync** - WebSocket support for multiplayer state synchronization

---

## API Endpoints

### 1. Text-to-Speech with Phonemes

**Endpoint:** `POST /api/tts/with-phonemes`

**Description:** Convert text to speech audio and return phoneme timing data for lip sync

**Request:**
```json
{
  "text": "Hello, world! How are you today?",
  "language": "en-US",
  "speaker": "default",
  "format": "mp3",
  "includePhonemes": true,
  "ssmlCompatible": false,
  "pitch": 1.0,
  "rate": 1.0,
  "volume": 1.0
}
```

**Response (200 OK):**
```json
{
  "text": "Hello, world! How are you today?",
  "audioUrl": "https://cdn.example.com/tts/audio_abc123.mp3",
  "audioData": "base64_encoded_audio_optional",
  "phonemes": [
    {
      "phoneme": "A",
      "time": 0.02,
      "duration": 0.08,
      "confidence": 0.98,
      "wordIndex": 0,
      "wordPosition": 0
    },
    {
      "phoneme": "E",
      "time": 0.10,
      "duration": 0.12,
      "confidence": 0.95,
      "wordIndex": 1,
      "wordPosition": 1
    }
  ],
  "duration": 3.45,
  "sampleRate": 22050,
  "bitRate": 128,
  "phonemeCount": 45,
  "totalWords": 6
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid request",
  "details": "Text field is required"
}
```

**Response (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Notes:**
- Phoneme timing should be accurate to ±10ms
- Support phonemes: A, E, I, O, U, M, F, V, TH, L, R, S, Z, SILENT
- Audio should be streamed to CDN and return URL (not embedded)
- Cache TTS results by text hash

---

### 2. Real-time Audio Emotion Analysis

**Endpoint:** `POST /api/ai/analyze-emotion`

**Description:** Analyze voice tone and text for emotional state

**Request:**
```json
{
  "frequencyData": [0, 12, 45, 78, 34, 56, 89, ...],
  "timeDomainData": [128, 130, 125, 135, 128, ...],
  "text": "Optional text for context",
  "sessionId": "session_abc123",
  "timestamp": 1698765432000,
  "duration": 0.25
}
```

**Response (200 OK):**
```json
{
  "emotion": "happy",
  "voiceTone": "positive",
  "confidence": 0.87,
  "intensity": 0.75,
  "features": {
    "pitch": 245,
    "energy": 0.68,
    "tempo": 135,
    "variance": 0.12,
    "spectralCentroid": 2100,
    "zeroCrossingRate": 0.32
  },
  "alternativeEmotions": [
    {
      "emotion": "excited",
      "confidence": 0.78
    },
    {
      "emotion": "concerned",
      "confidence": 0.34
    }
  ],
  "recommendations": {
    "gestureType": "celebratory",
    "ledColor": "#64FFDA",
    "intensity": 1.4
  }
}
```

**Notes:**
- frequency and timeDomain should be Uint8Array converted to array
- Confidence should be 0-1
- Return alternative emotions for ambiguous cases
- Consider both voice tone and text content
- Timestamp is for correlation with other events

---

### 3. Gesture Planning

**Endpoint:** `POST /api/ai/plan-gesture`

**Description:** LLM-based gesture planning based on conversation context

**Request:**
```json
{
  "userMessage": "Can you show me the sales report for Q3?",
  "aiResponse": "I'll present the Q3 sales report. Here are the key highlights...",
  "emotion": "thinking",
  "conversationHistory": [
    {
      "role": "user",
      "content": "What happened in Q3?",
      "timestamp": 1698765400000
    },
    {
      "role": "assistant",
      "content": "Q3 was quite successful...",
      "timestamp": 1698765410000
    }
  ],
  "includeSequence": true,
  "maxGestures": 3,
  "sessionId": "session_abc123"
}
```

**Response (200 OK):**
```json
{
  "userMessage": "Can you show me the sales report for Q3?",
  "aiResponse": "I'll present the Q3 sales report...",
  "emotion": "thinking",
  "gestures": [
    {
      "gesture": "present",
      "intensity": 0.8,
      "duration": 1.8,
      "startDelay": 0.0,
      "confidence": 0.92
    },
    {
      "gesture": "point",
      "intensity": 0.6,
      "duration": 0.9,
      "startDelay": 1.5,
      "confidence": 0.85
    }
  ],
  "reasoning": "User asks for presentation. AI is thinking about response. Recommended gestures: present (primary), then point for emphasis.",
  "suggestedEmotionShift": "excited",
  "suggestedLEDColor": "#00FFDA",
  "pacing": {
    "speechRate": 1.0,
    "pausePoints": [0.5, 1.2, 1.8]
  }
}
```

**Notes:**
- Gestures available: wave, point, nod, shake, think, present, explain, celebrate, alert, scan, idle, greeting, listening, speaking, searching, success, warning
- Intensity: 0-1, affects animation amplitude
- Duration: estimated seconds for gesture animation
- Return multiple gestures for longer responses
- Include reasoning for transparency
- Consider conversation history for context

---

### 4. Batch Processing

**Endpoint:** `POST /api/ai/batch`

**Description:** Process multiple requests in one call for efficiency

**Request:**
```json
{
  "requests": [
    {
      "id": "req1",
      "type": "tts",
      "payload": {
        "text": "Hello, world!",
        "language": "en-US"
      }
    },
    {
      "id": "req2",
      "type": "emotion",
      "payload": {
        "frequencyData": [12, 34, 56, ...],
        "sessionId": "session_abc123"
      }
    },
    {
      "id": "req3",
      "type": "gesture",
      "payload": {
        "userMessage": "...",
        "aiResponse": "...",
        "emotion": "happy"
      }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "req1",
      "status": "success",
      "data": {
        "audioUrl": "...",
        "phonemes": [...]
      }
    },
    {
      "id": "req2",
      "status": "success",
      "data": {
        "emotion": "happy",
        "confidence": 0.87
      }
    },
    {
      "id": "req3",
      "status": "success",
      "data": {
        "gestures": [...]
      }
    }
  ]
}
```

---

### 5. WebSocket Events (Real-time Sync)

**Endpoint:** `ws://api.example.com/robot-sync`

**Connection:**
```javascript
const socket = new WebSocket('ws://api.example.com/robot-sync');
socket.onopen = () => {
  socket.send(JSON.stringify({
    type: 'auth',
    token: 'bearer_token_here',
    sessionId: 'session_abc123'
  }));
};
```

**Incoming Events:**

**robot:state-update**
```json
{
  "type": "robot:state-update",
  "sessionId": "session_abc123",
  "timestamp": 1698765432000,
  "state": {
    "emotion": "happy",
    "gesture": "wave",
    "speaking": true,
    "listening": false,
    "position": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 }
  }
}
```

**robot:gesture-start**
```json
{
  "type": "robot:gesture-start",
  "gesture": "present",
  "intensity": 0.8,
  "duration": 1.8
}
```

**robot:emotion-change**
```json
{
  "type": "robot:emotion-change",
  "emotion": "excited",
  "ledColor": "#F472B6",
  "intensity": 1.8
}
```

**robot:broadcast (for multiplayer)**
```json
{
  "type": "robot:broadcast",
  "userId": "user_123",
  "state": {
    "position": { "x": 0.1, "y": 0.2, "z": 0.3 },
    "emotion": "thinking"
  }
}
```

**Outgoing Events (from client):**

**subscribe-to-robot**
```json
{
  "type": "subscribe-to-robot",
  "sessionId": "session_abc123"
}
```

**robot-state-change**
```json
{
  "type": "robot-state-change",
  "state": {
    "emotion": "happy",
    "gesture": "wave"
  }
}
```

---

## Authentication

All endpoints require authentication:

```
Authorization: Bearer <jwt_token>
```

**Token Payload:**
```json
{
  "sub": "user_id",
  "sessionId": "session_id",
  "scope": "robot:control",
  "iat": 1698765432
}
```

---

## Error Handling

**Standard Error Response (4xx/5xx):**
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "specific_error_details"
  },
  "requestId": "req_abc123",
  "timestamp": 1698765432000
}
```

**Common Error Codes:**
- `INVALID_REQUEST` - 400
- `UNAUTHORIZED` - 401
- `RATE_LIMITED` - 429
- `INTERNAL_ERROR` - 500
- `SERVICE_UNAVAILABLE` - 503

---

## Rate Limiting

- TTS: 100 requests/minute per user
- Emotion: 1000 requests/minute per session
- Gesture: 100 requests/minute per session
- Batch: 50 requests/minute per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1698765492
```

---

## Performance Requirements

- TTS response: < 2 seconds (p95)
- Emotion analysis: < 200ms (p95)
- Gesture planning: < 500ms (p95)
- Batch processing: < 1 second (p95)

---

## Caching Strategy

**Frontend should cache:**
- TTS results by text hash (24 hours)
- Phoneme data (24 hours)
- Gesture plans (12 hours)

**Backend should cache:**
- Emotion models/weights (persistent)
- TTS audio files (7 days)
- LLM responses (2 hours)

---

## Implementation Priority

1. **Phase 1** (Week 1-2)
   - TTS with phonemes endpoint
   - Basic phoneme extraction (use pre-trained models)

2. **Phase 2** (Week 3-4)
   - Emotion analysis endpoint
   - Simple frequency-based emotion detection

3. **Phase 3** (Week 5-6)
   - Gesture planning endpoint
   - LLM-based gesture selection

4. **Phase 4** (Week 7-8)
   - WebSocket real-time sync
   - Batch processing endpoint
   - Optimization and caching

---

## Backend Technologies Recommended

- **TTS**: Azure Cognitive Services, ElevenLabs, or Google Cloud Text-to-Speech
- **Phoneme extraction**: Forced alignment (Montreal Forced Aligner) or phoneme model
- **Emotion detection**: Pre-trained model (HuggingFace Transformers)
- **Gesture planning**: GPT-4 or Claude for conversation understanding
- **Real-time sync**: Socket.io or native WebSocket

---

## Testing

### Test Cases

1. **TTS with various text lengths**
   - Short: "Hi"
   - Medium: "Hello, how are you today?"
   - Long: Full paragraph responses

2. **Emotion detection accuracy**
   - Test with happy, sad, angry, neutral, excited audio
   - Verify confidence scores

3. **Gesture selection logic**
   - Test with greeting, question, explanation responses
   - Verify gesture sequences make sense

4. **Load testing**
   - Simulate 100 concurrent users
   - Test batch endpoint with 1000 requests

---

## Monitoring & Analytics

Track:
- API response times (p50, p95, p99)
- Error rates by endpoint
- Emotion detection accuracy
- Gesture selection appropriateness
- User satisfaction (feedback)
- Cache hit rates

---

## Security Considerations

- Validate and sanitize all text input
- Rate limit by user/session
- Encrypt audio data in transit (HTTPS/WSS)
- Store audio securely (access logs)
- Comply with privacy regulations (GDPR, CCPA)

