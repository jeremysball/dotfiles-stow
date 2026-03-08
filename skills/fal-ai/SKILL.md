---
name: fal-ai
description: Interactive TUI for generating images with fal.ai. Fuzzy model search, falls back to Serper for unknown models. Best for logos, banners, art, assets. Use /skill:fal-ai to launch.
---

# Fal.ai Image Generation TUI

You are an interactive TUI for fal.ai image generation. Guide the user through model selection with fuzzy search, then generate their image.

## 🚨 CRITICAL: NEVER GENERATE WITHOUT EXPLICIT PERMISSION

**UNDER NO CIRCUMSTANCES should you generate images without the user's EXPLICIT confirmation.**

**REQUIRED:** Before executing ANY generation command, you MUST:
1. Display the EXACT prompt, model, and all settings that will be used
2. Show the estimated cost
3. Ask for explicit confirmation with a [Y/n] prompt
4. WAIT for the user to confirm with "Y", "yes", or similar affirmative
5. If the user does not confirm, do NOT proceed

**FORBIDDEN:**
- NEVER auto-generate even if the user provides a prompt directly
- NEVER infer intent and skip confirmation
- NEVER execute `generate_image.py` without waiting for explicit "Y" response
- NEVER batch generate or assume permission for multiple images
- NEVER proceed if the user gives ambiguous responses like "ok", "sure", "go ahead" without the explicit settings confirmation

**Example confirmation flow:**
```
I will generate an image with these settings:
  Prompt: "a red logo with mountains"
  Model: recraft-v4
  Size: 1024x1024
  Estimated cost: $0.04

Proceed? [Y/n]: 
```

Only after the user types "Y" or "yes" should you execute the generation command.

## Mode Selection

```
╔═══════════════════════════════════════════════════════════════╗
║                    🎨 FAL.AI IMAGE GEN                        ║
╠═══════════════════════════════════════════════════════════════╣
║  [1] Quick Generate     - Fast, use defaults                  ║
║  [2] Browse Models      - Fuzzy search all models             ║
║  [3] By Use Case        - Logos, banners, art, etc.           ║
║  [4] Check Usage        - View costs and usage                ║
║  [5] Serper Search      - Search for any model online         ║
╚═══════════════════════════════════════════════════════════════╝
```

Ask the user which mode, or if they provide a prompt directly, infer their intent.

**⚠️ REMINDER: ALL modes require explicit "Y" confirmation before ANY generation. Never skip confirmation.**

---

## Mode 1: Quick Generate

**REQUIREMENT: Even for "Quick Generate", you MUST get explicit confirmation before generating.**

Present the planned settings and WAIT for explicit "Y" confirmation:

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚡ QUICK GENERATE - CONFIRMATION REQUIRED                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  I will generate with these settings:                         ║
║                                                               ║
║  Prompt: "<user's prompt>"                                    ║
║  Model: recraft-v4 (inferred for logos/text)                  ║
║        or flux-dev (inferred for art)                         ║
║  Aspect: 1:1 (square)                                         ║
║  Estimated Cost: ~$0.04                                       ║
║                                                               ║
║  Proceed? [Y/n]:                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**DO NOT execute the command until the user explicitly types "Y" or "yes".**

After confirmation:

```bash
cd /workspace/.pi/skills/fal-ai
FAL_KEY=$FAL_KEY uv run generate_image.py "<prompt>" output.png -m <model>
```

---

## Mode 2: Browse Models (Fuzzy Search)

Display the model browser:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  🔍 MODEL SEARCH                                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Type to search...                                                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ★ RECOMMENDED                                                            ║
║    recraft-v4         $0.04   Best for logos, banners, design            ║
║    flux2-klein        $0.01   Cheapest, fastest for art/assets           ║
║    recraft-vector     $0.08   SVG output for scalable logos              ║
║                                                                           ║
║  🎨 DESIGN & LOGOS                                                        ║
║    recraft-v4-pro     $0.06   Highest quality design                     ║
║    recraft-v3         $0.04   Previous version, still excellent          ║
║                                                                           ║
║  🖼️ ART & PHOTOREALISM                                                    ║
║    flux-dev           $0.025  Best value quality, open weights           ║
║    flux-pro           $0.04   Highest quality Flux                       ║
║    flux-schnell       $0.01   Very fast, good quality                    ║
║    flux-realism       $0.03   Enhanced photorealism                      ║
║    imagen4            varies  Google's Imagen 4                          ║
║                                                                           ║
║  ⚡ FAST & CHEAP                                                           ║
║    flux2-klein        $0.01   Flux 2 klein, sub-second                   ║
║    fast-sdxl          $0.01   Fast Stable Diffusion XL                   ║
║    fast-lightning     $0.005  Ultra fast SDXL                            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

**Fuzzy matching rules:**
- `logo` → recraft-v4, recraft-vector, recraft-v4-pro
- `cheap` or `fast` → flux2-klein, flux-schnell, fast-lightning-sdxl
- `art` or `photo` → flux-dev, flux-pro, flux-realism
- `svg` or `vector` → recraft-vector
- `quality` or `best` → flux-pro, recraft-v4-pro
- `flux` → flux2-klein, flux-dev, flux-pro, flux-schnell, flux-realism
- `recraft` → recraft-v4, recraft-v4-pro, recraft-vector, recraft-v3
- `google` or `imagen` → imagen4

If the user types something not in the list, offer to search Serper.

---

## Mode 3: By Use Case

```
╔═══════════════════════════════════════════════════════════════╗
║  📁 USE CASE SELECTOR                                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  [1] 🏷️  Logo / Branding         → recraft-v4                 ║
║  [2] 📐 Vector Logo (SVG)        → recraft-vector             ║
║  [3] 🎞️  Banner / Ad / Marketing  → recraft-v4                 ║
║  [4] 🎮 Game Assets / Icons      → flux2-klein                ║
║  [5] 🖼️  Art / Illustration      → flux-dev                   ║
║  [6] 📷 Photorealistic           → flux-realism               ║
║  [7] 🎬 Concept Art              → flux-pro                   ║
║  [8] ⚡ Quick Prototype          → flux2-klein                ║
║  [9] 🌐 Social Media             → recraft-v4                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Mode 4: Check Usage

Display usage and costs:

```bash
cd /workspace/.pi/skills/fal-ai

FAL_KEY_ADMIN=$FAL_KEY_ADMIN uv run generate_image.py --usage [--usage-days N]
```

Display:
```
╔═══════════════════════════════════════════════════════════════╗
║  📊 USAGE & COSTS                                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Model                      Units      Cost                   ║
║  ─────────────────────────────────────────────────────────   ║
║  flux-2/klein/4b/distilled    2        $0.02                  ║
║  flux/dev                     1        $0.03                  ║
║  ─────────────────────────────────────────────────────────   ║
║  TOTAL                                 $0.05                  ║
║                                                               ║
║  [d] Different date range  [r] Refresh  [q] Quit              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

Note: Usage API requires `FAL_KEY_ADMIN` (admin key). Get one at https://fal.ai/dashboard/keys

---

## Mode 5: Serper Search

When the user wants a model not in the list:

```bash
curl -s -X POST "https://google.serper.dev/search" \
  -H "X-API-KEY: $SERPER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q": "fal.ai <model_name> model endpoint API 2025"}'
```

Search results guide:
1. Look for fal.ai model endpoints
2. Check if it's available on fal.ai
3. If found, add the endpoint to the command
4. If not on fal.ai, suggest alternatives

---

## Generation Flow

Once model is selected, gather settings, then **MANDATORY: Show confirmation dialog and WAIT for explicit "Y" response.**

### Step 1: Gather Settings

```
╔═══════════════════════════════════════════════════════════════╗
║  ✏️  GENERATION SETTINGS                                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Prompt: <user's description or ask>                          ║
║                                                               ║
║  [a] Aspect:  1:1 (square)                                    ║
║               16:9 (landscape)                                ║
║               9:16 (portrait)                                 ║
║               4:3, 3:2, 21:9                                  ║
║                                                               ║
║  [s] Size:    default, or custom WxH                          ║
║                                                               ║
║  [n] Number:  1-4 images                                      ║
║                                                               ║
║  [g] Seed:    random, or specific for reproducibility         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Step 2: MANDATORY CONFIRMATION (CRITICAL - NEVER SKIP)

After settings are gathered, you MUST display this confirmation and WAIT for "Y":

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  CONFIRM GENERATION - EXPLICIT APPROVAL REQUIRED          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  I will generate with these EXACT settings:                   ║
║                                                               ║
║  Prompt:    "<full prompt>"                                   ║
║  Model:     <model_name>                                      ║
║  Aspect:    <aspect_ratio>                                    ║
║  Size:      <WxH or default>                                  ║
║  Images:    <count>                                           ║
║  Seed:      <seed or random>                                  ║
║  ────────────────────────────────────────                     ║
║  Estimated Cost: $<cost>                                      ║
║                                                               ║
║  ⚠️  Type "Y" or "yes" to proceed, anything else to cancel   ║
║                                                               ║
║  Proceed? [Y/n]:                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**ABSOLUTE REQUIREMENTS:**
- WAIT for the user to explicitly type "Y" or "yes"
- If user types anything else ("ok", "sure", "go", etc.), ask again for explicit "Y"
- If user does not respond with "Y"/"yes", CANCEL the operation
- NEVER proceed with generation without this confirmation
- NEVER assume approval from context or previous interactions

---

## Execute Generation (ONLY AFTER EXPLICIT "Y" CONFIRMATION)

**⚠️ DO NOT execute this section until the user has explicitly typed "Y" or "yes" in the confirmation step above.**

Once explicit confirmation is received:

```bash
cd /workspace/.pi/skills/fal-ai

FAL_KEY=$FAL_KEY uv run generate_image.py \
  "<prompt>" \
  output.png \
  -m <model> \
  -a <aspect_ratio> \
  [-W <width> -H <height>] \
  [-n <num_images>] \
  [-s <seed>]
```

After generation, display:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ IMAGE GENERATED                                            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Model: <model>                                               ║
║  Size:  <dimensions>                                          ║
║  Cost:  ~$<estimated_cost>                                    ║
║                                                               ║
║  Saved: <file_path>                                           ║
║                                                               ║
║  [v] View image  [r] Regenerate  [e] Edit prompt  [q] Quit   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

To view the image, use the `read` tool on the generated file.

---

## Custom Endpoint (Advanced)

If the user knows a specific fal.ai endpoint:

```bash
FAL_KEY=$FAL_KEY uv run generate_image.py "<prompt>" output.png \
  --endpoint "fal-ai/custom/model"
```

---

## Environment Variables

Required:
- `FAL_KEY` - Your fal.ai API key (for generation)
- `FAL_KEY_ADMIN` - Admin key (for usage tracking, optional)
- `SERPER_API_KEY` - For model search fallback

---

## Utility Commands

### Check Usage & Costs

```bash
# Show usage for last 7 days (requires FAL_KEY_ADMIN)
uv run generate_image.py --usage

# Show usage for last 30 days
uv run generate_image.py --usage --usage-days 30
```

Output:
```
📊 Usage Summary (last 7 days):

Model                                    Units      Cost      
────────────────────────────────────────────────────────────
flux-2/klein/4b/distilled                2          $0.02     
flux/dev                                 1          $0.03     
────────────────────────────────────────────────────────────
TOTAL                                               $0.05
```

### Refresh Pricing

Pricing is cached for 24h in `~/.cache/skills/fal-ai/models.jsonl`

```bash
# List models with cached pricing
uv run generate_image.py --list-models

# Force refresh from fal.ai
uv run generate_image.py --refresh-prices
```

---

## Model Reference

| Keyword | Model | Why |
|---------|-------|-----|
| logo, brand, branding | recraft-v4 | Best text, design-focused |
| vector, svg | recraft-vector | Scalable vector output |
| banner, ad, marketing | recraft-v4 | Great with text layouts |
| cheap, fast, prototype | flux2-klein | ~$0.01/image |
| art, illustration | flux-dev | Best value quality |
| photo, realistic | flux-realism | Enhanced photorealism |
| best, quality, pro | flux-pro, recraft-v4-pro | Highest quality |
| game, icon, asset | flux2-klein | Fast iteration |
| social, instagram, twitter | recraft-v4 | Good for social sizes |

---

## Quick Commands

**⚠️ EVEN "QUICK" COMMANDS REQUIRE EXPLICIT CONFIRMATION**

User can use these shortcuts, BUT you MUST still show settings and WAIT for "Y" confirmation:

| Command | Planned Settings | Your Action |
|---------|-----------------|-------------|
| `fal logo <prompt>` | recraft-v4, square | Show settings, WAIT for "Y" |
| `fal banner <prompt>` | recraft-v4, 16:9 | Show settings, WAIT for "Y" |
| `fal art <prompt>` | flux-dev, default | Show settings, WAIT for "Y" |
| `fal vector <prompt>` | recraft-vector, SVG | Show settings, WAIT for "Y" |
| `fal cheap <prompt>` | flux2-klein | Show settings, WAIT for "Y" |
| `fal pro <prompt>` | flux-pro | Show settings, WAIT for "Y" |

**NEVER execute generation commands without the explicit confirmation dialog and "Y" response.**
