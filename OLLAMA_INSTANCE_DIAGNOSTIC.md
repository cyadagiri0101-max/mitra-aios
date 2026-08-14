# OLLAMA_INSTANCE_DIAGNOSTIC

## Port Owner
- **PID**: 23208
- **Process**: ollama.exe
- **Path**: C:\Users\Srikanth\AppData\Local\Programs\Ollama\ollama.exe
- **Port**: 127.0.0.1:11434 (LISTENING)
- **Owner**: Windows Host Ollama

## Host Models (localhost:11434/api/tags)
```json
{
  "models": [
    {
      "name": "openchat:latest",
      "model": "openchat:latest",
      "size": 4109876386,
      "family": "llama"
    },
    {
      "name": "phi3:latest",
      "model": "phi3:latest",
      "size": 2176178913,
      "family": "phi3"
    }
  ]
}
```

## Container Models (podman exec mitra30_ollama_1 ollama list)
```
NAME                       ID              SIZE      MODIFIED
nomic-embed-text:latest    0a109f422b47    274 MB    21 minutes ago
phi3:latest                4f2222927938    2.2 GB    4 hours ago
```

## Conclusion

### Status: DIFFERENT INSTANCES ❌

**localhost:11434 is answering requests from Windows Ollama (host process).**

**Container mitra30_ollama_1 is running a separate Ollama instance with different models.**

### Model Mismatch:
| Model | Host Ollama | Container Ollama |
|-------|-------------|------------------|
| nomic-embed-text | ❌ Missing | ✅ Present |
| openchat | ✅ Present | ❌ Missing |
| phi3 | ✅ Present | ✅ Present |

### Root Cause:
Backend is configured to use `localhost:11434`, which connects to **Windows Ollama**, not the **Container Ollama**.

The backend cannot access `nomic-embed-text` because it is only available in the container instance.

## Recommended Fix

### Option 1: Stop Windows Ollama (PREFERRED)
1. Stop the Windows Ollama service
2. Restart the backend to connect to container via `localhost:11434`

### Option 2: Reconfigure Backend
1. Set environment variable: `OLLAMA_URL=http://ollama:11434`
2. Restart the backend container

**Proceed with Option 2 (reconfigure backend).**

### Next Step
- Modify backend environment to use `OLLAMA_URL=http://ollama:11434`
- Restart mitra30_backend_1
- Verify embeddings work with nomic-embed-text:latest
