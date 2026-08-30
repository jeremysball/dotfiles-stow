---
name: civitai
description: Browse and download models from Civitai. Query models, images, creators, and tags via the REST API. Note: Image generation is NOT available via API — use the website or download models for local generation.
---

# Civitai Model Browser & Downloader

Query and download models from Civitai using their public REST API. **Note: Image generation is NOT available via the public API.** To generate images, either use the Civitai website directly or download models to run locally.

---

## ⚠️ IMPORTANT: Read-Only API

The Civitai REST API v1 is **read-only**. It supports querying models, images, creators, and tags, plus downloading model files. **Image generation requires either:**

1. **Civitai Website** — Use the on-site generator at civitai.com (requires Buzz)
2. **Local Generation** — Download models and run in ComfyUI, Automatic1111, etc.
3. **Third-party Services** — Use fal.ai, Replicate, or RunPod with downloaded models

---

## Prerequisites

**Required Environment Variables:**
- `CIVITAI_API_KEY` - Your Civitai API key (from https://civitai.com/user/account#api)

---

## Available Endpoints

### Check Buzz Balance
```bash
curl -s "https://api.civitai.com/v1/buzz" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

### Search Models
```bash
curl -s "https://api.civitai.com/v1/models?query=clawmarks&limit=10" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

### Get Model Details
```bash
curl -s "https://api.civitai.com/v1/models/2420882" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

### Get Model Version
```bash
curl -s "https://api.civitai.com/v1/model-versions/2721781" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

### List Images
```bash
curl -s "https://api.civitai.com/v1/images?username=lordxarus&limit=10" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

### Download Model
```bash
curl -L -o model.safetensors \
  "https://civitai.com/api/download/models/2721781" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"
```

---

## Model URN Format

For use in external tools (ComfyUI, etc.):

| Model | URN |
|-------|-----|
| SDXL Base | `urn:air:sdxl:checkpoint:civitai:128641@128641` |
| SD 1.5 | `urn:air:sd1:checkpoint:civitai:4384@128641` |
| Pony Diffusion | `urn:air:pony:checkpoint:civitai:257749@290640` |
| Flux Schnell | `urn:air:flux1:checkpoint:civitai:618692@691639` |

---

## Workflow: Download & Generate Locally

1. **Find model** via API search
2. **Get version ID** from model details
3. **Download** the `.safetensors` file
4. **Load in ComfyUI/A1111** and generate locally

Example for CLAWMARKS LoRA:
```bash
# Download
export CIVITAI_API_KEY="your_key"
curl -L -o clawmarks.safetensors \
  "https://civitai.com/api/download/models/2721781" \
  -H "Authorization: Bearer $CIVITAI_API_KEY"

# Load in ComfyUI and generate with trigger word: trentbuckle
```

---

## What Does NOT Work ❌

The following endpoints mentioned in old documentation do NOT exist:
- `POST /v1/generation` — Does not exist
- `POST /v1/images/create` — Does not exist  
- `POST /v1/images/text-to-image` — Does not exist

Civitai generation requires the website interface or local execution.

---

## External Generation Options

| Service | Supports Civitai Models | Notes |
|---------|------------------------|-------|
| **fal.ai** | Yes (download & upload) | Fast, pay-per-use |
| **Replicate** | Yes | Cloud GPUs |
| **RunPod** | Yes | Rent GPU by hour |
| **ComfyUI (local)** | Yes | Free, requires GPU |
| **Automatic1111** | Yes | Free, requires GPU |

---

## API Reference

Full documentation: https://github.com/civitai/civitai/wiki/REST-API-Reference
