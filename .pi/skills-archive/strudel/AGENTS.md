# Strudel Agent Guidelines

## Mandatory Reading

Before generating ANY Strudel code, read these files in order:

1. **`./llm.txt`** — Complete syntax reference (MUST READ FIRST)
2. **`./docs/REFERENCE.md`** — Comprehensive reference guide
3. **`./docs/songs/`** — Study real implementations (see below)

### Song Files to Study by Technique

| Technique | File |
|-----------|------|
| Song structure with `pickRestart()` | `bustybeez.js`, `magicandecstasy.js`, `verminmangle.js` |
| Drum programming with `pickOut()` | `mouthbreathercomplex.js`, `disto.js` |
| Guitar/chord voicings | `clubbed.js` |
| Filter envelopes | `disto.js` |
| Layered orchestration | `magicandecstasy.js`, `verminmangle.js` |

---

## Critical Lessons Learned

### 1. Gain Levels Are TOO HIGH

**WRONG:**
```javascript
$: s("bd*4").gain(1.1).distort(0.6)
$: note("c1").s("sawtooth").gain(1.0)
```

**RIGHT:**
```javascript
$: s("bd*4").gain(0.6).velocity(0.7)
$: note("c1").s("sawtooth").gain(0.5)
```

- Individual pattern gains should be 0.3-0.7
- Use `.velocity()` for per-hit dynamics on drums
- Use `all(x => x.postgain(1.5))` to bring overall mix up

### 2. Use `setcps()` Not `setcpm()`

**WRONG:**
```javascript
setcpm(150/4)  // Confusing, non-standard
```

**RIGHT:**
```javascript
setcps(150/60)      // 150 BPM, standard
setcps(182/60/8)    // 182 BPM, 8 beats per cycle (for complex patterns)
```

### 3. Distortion Values Are TOO HIGH

**WRONG:**
```javascript
.distort(0.8).shape(0.6).crush(8)
```

**RIGHT:**
```javascript
.distort("10:0.17")  // amount:wet ratio
.distort(0.2).shape(0.15)
.crush(12)           // higher = less crushing
```

### 4. Use `pickOut()` for Clean Drum Programming

**WRONG:**
```javascript
$: s("bd sd bd sd").bank("RolandTR808").gain(0.8)
$: s("hh*8").bank("RolandTR808").gain(0.3)
```

**RIGHT:**
```javascript
$: "<bd sd [bd bd] sd>,hh*8,<~ cr ~ cr>".pickOut({
  bd: s('bd').velocity(0.65).lpf(800),
  sd: s('sd').velocity(0.55).hpf(200),
  hh: s('hh').velocity(0.3).pan(rand),
  cr: s('cr').velocity(0.12).pan(0.55)
}).bank('linn9000').gain(0.6)
```

### 5. Use `all()` for Global Effects

```javascript
all(x => x.room(0.3).postgain(1.5))
```

This applies reverb and boosts the final output consistently.

### 6. Use `.layer()` for Rich Timbres

```javascript
note("c3 e3 g3").layer(
  x => x.s("gm_trumpet").pan(0.3).gain(0.6),
  x => x.s("gm_vibraphone").delay(0.4).gain(0.4)
)
```

### 7. Use `.mask()` for Song Structure

Instead of deleting/muting patterns, use mask to create sections:

```javascript
$: note("c3 e3 g3").s("sine").mask("<0 0 1 1>/4")  // silent 2 cycles, plays 2
```

### 8. Use Named Constants for Song Structure

```javascript
const song = `<intro@8 verse@16 chorus@8 bridge@8 verse@16 chorus@16>`
const parts = {
  intro: "...",
  verse: "...",
  chorus: "...",
  bridge: "..."
}
$: song.pickRestart(parts)
```

### 9. Use GM Instruments for Realism

```javascript
note("c3").s("gm_electric_guitar_clean:2")
note("c3").s("gm_brass_section:1")
note("c3").s("gm_church_organ:3")
note("c3").s("gm_tuba:3")
```

### 10. Filter Envelopes Are Your Friend

```javascript
note("c3").s("supersaw")
  .lpa(0)        // filter attack
  .lpd(0.2)      // filter decay
  .lpe(10)       // filter envelope amount (semitones)
  .lpr(1)        // filter release
  .lpf(100)      // base cutoff
```

### 11. Let Patterns BREATHE

**WRONG:**
```javascript
$: s("bd bd bd bd")      // relentless
$: note("c3 d3 e3 f3 g3 a3 b3 c4")  // too dense
```

**RIGHT:**
```javascript
$: s("bd ~ [~ bd] ~")    // space between hits
$: note("<c3 ~ e3 g3>")  // strategic rests
```

### 12. Pitch Envelopes for 808s

```javascript
note("c1").s("sine")
  .penv(8)      // sweep down 8 semitones
  .pdec(0.05)   // quick pitch decay
  .lpf(80)      // keep it subby
  .gain(0.6)    // NOT 1.0
```

---

## Quick Reference: Reasonable Defaults

| Parameter | Good Range | Notes |
|-----------|------------|-------|
| `.gain()` | 0.3 - 0.7 | Per-pattern volume |
| `.velocity()` | 0.3 - 0.8 | Per-hit dynamics |
| `.distort()` | 0.1 - 0.3 | Or `"amount:wet"` format |
| `.shape()` | 0.1 - 0.3 | Waveshaping |
| `.crush()` | 10 - 16 | Higher = less crushing |
| `.room()` | 0.2 - 0.5 | Reverb send |
| `.lpf()` | 200 - 2000 | Low-pass cutoff |
| `.penv()` | 3 - 12 | Pitch envelope depth |

---

## Pattern Generation Workflow

1. **READ** `./llm.txt` first
2. **STUDY** relevant song files from `./docs/songs/`
3. **START SIMPLE** — drums + bass only
4. **ADD LAYERS** one at a time
5. **KEEP GAINS LOW** — 0.3-0.7 per layer
6. **USE `all()`** for global effects
7. **LET IT BREATHE** — rests are musical
8. **TEST INCREMENTALLY** — add layers one by one

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Everything at gain 1.0 | Use 0.3-0.7, use `postgain()` |
| No reverb on anything | Use `all(x => x.room(0.3))` |
| Relentless 16th notes | Add rests: `~` and `@` |
| Same drum sound every hit | Use `:0`, `:1` variants |
| All synths same volume | Vary gains per layer |
| No song structure | Use `pickRestart()` or `mask()` |
| Distortion at 0.8 | Use 0.1-0.3 |
| Forget `.orbit()` | Assign unique orbits per `$:` |

---

## File Structure

```
./
├── AGENTS.md          ← This file
├── SKILL.md           ← Skill instructions
├── llm.txt            ← Complete syntax reference
└── docs/
    ├── REFERENCE.md   ← Comprehensive reference
    ├── songs/         ← Real song implementations
    │   ├── bustybeez.js
    │   ├── magicandecstasy.js
    │   ├── mouthbreathercomplex.js
    │   ├── disto.js
    │   ├── clubbed.js
    │   └── ...
    ├── learn/         ← Tutorials
    │   ├── getting-started/
    │   ├── mini-notation/
    │   ├── synths/
    │   ├── effects/
    │   └── ...
    └── recipes/       ← Recipe examples
```
