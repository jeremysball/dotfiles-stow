# Strudel Reference Guide

> Comprehensive reference for Strudel live coding music synthesis

## Table of Contents
1. [Quick Start](#quick-start)
2. [Mini-Notation](#mini-notation)
3. [Core Functions](#core-functions)
4. [Samples](#samples)
5. [Synths](#synths)
6. [Audio Effects](#audio-effects)
7. [Pattern Effects](#pattern-effects)
8. [Time & Tempo](#time--tempo)
9. [Scales & Notes](#scales--notes)
10. [Chords & Voicings](#chords--voicings)
11. [Signals](#signals)
12. [Example Songs](#example-songs)

---

## Quick Start

```javascript
// Basic sound pattern
s("bd sd hh sd")

// Notes with synth
note("c3 e3 g3 c4").s("sawtooth")

// Stack patterns together
stack(
  s("bd*4"),
  note("c2 eb2 g2 c3").s("sawtooth")
)

// Or use $: shorthand for parallel patterns
$: s("bd*4")
$: note("c2 eb2 g2 c3").s("sawtooth")

// Set tempo (cycles per minute)
setcpm(120/4) // 120 BPM with 4 beats per cycle
```

---

## Mini-Notation

The Mini-Notation is a compact language for writing rhythmic patterns.

### Basic Syntax

| Concept | Syntax | Example | Description |
|---------|--------|---------|-------------|
| Sequence | space | `"c e g b"` | Events play in sequence within one cycle |
| Sample Number | `:` | `"bd:1 sd:0"` | Select specific sample variant |
| Rests | `~` or `-` | `"c ~ g ~"` | Silence |
| Sub-sequences | `[]` | `"c [e g] b"` | Nest events |
| Parallel/Polyphony | `,` | `"[c,e,g]"` | Play simultaneously (chords) |

### Timing

| Concept | Syntax | Example | Description |
|---------|--------|---------|-------------|
| Speed up | `*` | `"[c e]*2"` | Play twice per cycle |
| Slow down | `/` | `"[c e g]/2"` | Play over 2 cycles |
| Angle brackets | `<>` | `"<c e g b>"` | Auto-length based on events |
| Elongate | `@` | `"<c@2 e g>"` | Give temporal weight |
| Replicate | `!` | `"<c!2 e g>"` | Repeat without speeding |

### Randomness

| Concept | Syntax | Example | Description |
|---------|--------|---------|-------------|
| Maybe | `?` | `"c? e? g?"` | 50% chance of playing |
| Maybe with prob | `?0.8` | `"c?0.8"` | 80% chance |
| Random choice | `\|` | `"c\|e\|g"` | Pick one randomly |

### Euclidean Rhythms

```javascript
// Format: (beats, segments, offset)
s("bd(3,8)")      // 3 beats over 8 segments
s("bd(3,8,2)")    // with offset of 2
s("bd(5,8), hh(3,8)")  // combine patterns
```

### Multi-line Strings

```javascript
note(`
  c e g b
  a b c d
`).s("sawtooth")
```

---

## Core Functions

### Sound Functions

```javascript
// Play samples
s("bd sd hh")           // basic samples
sound("bd sd hh")       // same as s()

// Select drum machine bank
s("bd sd hh").bank("RolandTR909")
s("bd sd hh").bank("RolandTR808")
s("bd sd hh").bank("AkaiLinn")
```

### Note Functions

```javascript
// MIDI numbers (0-127)
note("60 64 67 72")

// Note names (scientific pitch notation)
note("c4 e4 g4 c5")

// With accidentals
note("c#4 eb4 g4 bb4")

// Frequency in Hz
freq(440)
freq("220 330 440")
```

### Sample Selection

```javascript
// Select sample number with n
s("hh*8").n("0 1 2 3 4 5 6 7")
s("hh:0 hh:1 hh:2 hh:3")  // same inline
```

---

## Samples

### Default Samples

**Drum sounds:**
| Abbreviation | Sound |
|--------------|-------|
| `bd` | Bass drum / Kick |
| `sd` | Snare drum |
| `rim` | Rimshot |
| `cp` | Clap |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `lt` | Low tom |
| `mt` | Medium tom |
| `ht` | High tom |
| `rd` | Ride cymbal |
| `cr` | Crash cymbal |

**Other sounds:** `sh` (shaker), `cb` (cowbell), `tb` (tambourine), `perc`, `misc`, `fx`

### Loading Custom Samples

```javascript
// From URLs
samples({
  kick: 'bd/BT0AADA.wav',
  snare: ['sd/rytm-01.wav', 'sd/rytm-02.wav'],
}, 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/');

// From GitHub
samples('github:tidalcycles/dirt-samples')

// Pitched samples
samples({
  'bass': { 'c2': 'bass_c2.wav', 'e2': 'bass_e2.wav' }
}, 'https://example.com/samples/');
```

### Sampler Effects

```javascript
s("rave").begin("<0 .25 .5 .75>")  // Skip start of sample
s("bd*2").end("<.1 .2 .5 1>")       // Cut end of sample
s("casio").loop(1)                   // Loop the sample
s("[oh hh]*4").cut(1)               // Cut group (hihat choke)
s("bd").clip(1)                      // Legato/duration multiplier
```

---

## Synths

### Basic Waveforms

```javascript
note("c3 e3 g3").s("sine")
note("c3 e3 g3").s("sawtooth")  // or "saw"
note("c3 e3 g3").s("square")
note("c3 e3 g3").s("triangle")  // default for note()
```

### Noise Types

```javascript
s("white")   // harsh noise
s("pink")    // medium noise
s("brown")   // soft noise
s("crackle") // crackly noise

// Add noise to oscillator
note("c3").s("sawtooth").noise(0.25)
```

### Envelope (ADSR)

```javascript
note("c3 e3 g3")
  .attack(0.01)   // attack time
  .decay(0.1)     // decay time  
  .sustain(0.5)   // sustain level (0-1)
  .release(0.2)   // release time

// Short notation: "attack:decay:sustain:release"
note("c3").adsr("0.01:0.1:0.5:0.2")
```

### FM Synthesis

```javascript
note("c3 e3 g3")
  .fm(4)           // modulation index (brightness)
  .fmh(2)          // harmonicity ratio
  .fmattack(0.01)  // FM envelope attack
  .fmdecay(0.1)    // FM envelope decay
  .fmsustain(0.5)  // FM envelope sustain
```

### Additive Synthesis

```javascript
// Control harmonics
note("c3").s("sawtooth")
  .partials([1, 1, 0.5, 0.25])

// Custom waveform
note("c3").s("user")
  .partials([1, 0, 0.3, 0, 0.1])

// Phase control
note("c3").phases([0, 0.5, 0, 0.25])
```

### Vibrato

```javascript
note("a3 e3").vib(4)        // 4Hz vibrato
note("a3 e3").vib("4:12")   // 4Hz vibrato, 12 semitone depth
note("a3 e3").vib(4).vibmod(2)  // separate depth control
```

### Wavetable Synthesis

```javascript
// Use wt_ prefix for wavetable samples
samples('bubo:waveforms');
note("c3 e3 g3").s('wt_flute')
```

---

## Audio Effects

### Filters

```javascript
note("c3 e3 g3").lpf(1000)     // low-pass filter
note("c3 e3 g3").hpf(200)      // high-pass filter
note("c3 e3 g3").bpf(500)      // band-pass filter

// With resonance
note("c3").lpf(1000).resonance(5)
```

### Delay & Reverb

```javascript
note("c3").delay(0.5)          // delay amount (0-1)
note("c3").delay("0.5:.25")    // delay:feedback
note("c3").delay("0.5:.25:.5") // delay:feedback:time

note("c3").room(0.5)           // reverb amount
note("c3").size(0.8)           // reverb size
```

### Distortion & Shape

```javascript
note("c3").distort(0.5)        // distortion amount
note("c3").shape(0.5)          // waveshaping
note("c3").crush(8)            // bit crush (bits)
```

### Dynamics

```javascript
note("c3").gain(0.5)           // volume (0-1+)
note("c3").pan(0.5)            // stereo pan (0-1, 0.5=center)
note("c3").compressor(-20)     // compressor threshold
```

### Modulation

```javascript
note("c3").tremolo(0.5)        // tremolo amount
note("c3").phaser(0.5)         // phaser
note("c3").chorus(0.5)         // chorus
```

### Vowel Filter

```javascript
note("c3 e3 g3").vowel("a e i o u")
```

### Speed

```javascript
s("bd*4").speed(1.5)           // playback speed
s("bd*4").speed("<0.5 1 2>")   // pattern speed
```

---

## Pattern Effects

### Time Manipulation

```javascript
note("c e g").fast(2)          // speed up 2x
note("c e g").slow(2)          // slow down 2x
note("c e g").rev()            // reverse pattern
```

### Pattern Combination

```javascript
// Stack patterns in parallel
stack(
  s("bd*4"),
  note("c3 eb3 g3")
)

// Superimpose modified version
note("c e g").superimpose(x => x.add(12))

// Off - copy with time offset and modification
note("c e g").off(1/8, x => x.add(12))
```

### Jux

```javascript
// Apply effect to right channel only
note("c e g").jux(x => x.rev())
note("c e g").juxBy(0.5, x => x.fast(2))
```

### Add/Scale

```javascript
note("c e g").add(12)          // transpose up octave
note("c e g").add("<0 12>")    // pattern transpose
note("c e g").scale("C:major") // quantize to scale
```

### Ply

```javascript
// Speed up each event n times
note("c e g").ply(2)
note("c e g").ply("<1 2 3>")
```

### Degrade

```javascript
note("c e g").degrade()        // randomly remove 50%
note("c e g").degradeBy(0.2)   // remove 20%
```

---

## Time & Tempo

### Setting Tempo

```javascript
setcpm(120/4)  // 120 BPM, 4 beats per cycle
setcps(0.5)    // 0.5 cycles per second (default)
setcps(1)      // 1 cycle per second

// Pattern tempo
note("c e g").cpm(120/4)
```

### Understanding Cycles

- Default: 1 cycle = 2 seconds (0.5 CPS)
- A cycle is the basic unit of time in Strudel
- Patterns loop within cycles
- Events are squished/stretched to fit cycles

---

## Scales & Notes

### Using Scales

```javascript
// n = scale degree (0-indexed)
n("0 2 4 6").scale("C:major")
n("0 2 4 6").scale("A:minor")
n("0 2 4 6").scale("D:dorian")
n("0 2 4 6").scale("G:mixolydian")
n("0 2 4 6").scale("F:major:pentatonic")
```

### Common Scales

- `major`, `minor`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `locrian`
- `pentatonic`, `blues`, `chromatic`
- `harmonic_minor`, `melodic_minor`

### Pattern Scales

```javascript
n("0 1 2 3").scale("<C:major D:minor E:minor>")
```

---

## Chords & Voicings

### Chord Symbols

```javascript
// Basic triads
chord("C Dm Em F G Am")

// Extended chords
chord("Cmaj7 Dm7 Em7 Fmaj7")
chord("C7 Dm7 G7")
chord("C9 Dm9 G13")

// Common symbols
// m = minor, M/maj = major, 7 = seventh
// dim = diminished, aug = augmented
// sus2, sus4, add9, etc.
```

### Voicing Function

```javascript
// Automatic voice leading
chord("C Am Dm G7").voicing()

// With anchor (top note target)
chord("C Am Dm G7").voicing().anchor("c5")

// Different modes
chord("C Am Dm G7").voicing().mode("below")  // default
chord("C Am Dm G7").voicing().mode("above")
```

---

## Signals

Signals allow continuous modulation of parameters.

### Basic Waveforms

```javascript
sine    // sine wave (0-1)
saw     // sawtooth wave
square  // square wave
tri     // triangle wave
rand    // random values
perlin  // perlin noise
```

### Using Signals

```javascript
// Modulate with range
note("c3").cutoff(sine.slow(4).range(200, 2000))
note("c3").gain(sine.range(0.3, 0.8))
note("c3").pan(sine.range(0, 1))

// Slow down the modulation
note("c3").cutoff(sine.slow(8).range(200, 2000))

// Fast modulation
note("c3").cutoff(sine.fast(4).range(200, 2000))
```

### Signal Combination

```javascript
// Combine signals
note("c3").cutoff(sine.add(tri).range(200, 2000))
note("c3").gain(sine.mul(0.5).add(0.5))
```

---

## Example Songs

### Basic Drum Beat

```javascript
setcpm(120/4)
$: s("bd [~ bd] sd bd").bank("RolandTR909")
$: s("hh*8").bank("RolandTR909").gain(0.5)
$: s("[~ cp]*2").bank("RolandTR909").gain(0.7)
```

### House Beat

```javascript
setcpm(126/4)
$: s("bd*4").bank("RolandTR909")
$: s("[~ oh]*2").bank("RolandTR909").gain(0.3)
$: s("hh*16").bank("RolandTR909").gain(0.15)
```

### Simple Bass Line

```javascript
setcpm(120/4)
note("<c2 [c2 eb2] f2 g2>")
  .s("sawtooth")
  .lpf(400)
  .decay(0.1)
  .sustain(0.3)
  .release(0.1)
  .gain(0.6)
```

### Melodic Pattern

```javascript
setcpm(100/4)
note("<[e5 b4 d5 c5] [a4 a4 c5 e5] [b4 ~ c5 d5] [c5 a4 a4 ~]>")
  .s("triangle")
  .delay(0.3)
  .room(0.4)
  .gain(0.5)
```

### Full Track Example

```javascript
setcpm(128/4)

// Drums
$: s("bd*4, [~ sd]*2, hh*8").bank("RolandTR909").gain(0.8)

// Bass
$: note("<c2 [c2 eb2] f2 g2>")
  .s("sawtooth")
  .lpf(300)
  .gain(0.5)

// Chords
$: chord("<Cm Am Fm Gm>")
  .voicing()
  .s("triangle")
  .lpf(2000)
  .room(0.5)
  .gain(0.3)

// Melody
$: note("<e5 g5 bb5 c6>/2")
  .s("sine")
  .delay(0.4)
  .room(0.6)
  .gain(0.25)
```

### Euclidean Rhythms

```javascript
setcpm(120/4)
$: s("bd(3,8)").bank("RolandTR808")
$: s("sd(5,8)").bank("RolandTR808").gain(0.7)
$: s("hh(7,16)").bank("RolandTR808").gain(0.3)
```

### Pattern Effects Demo

```javascript
setcpm(110/4)

// With off (echo)
note("c3 eb3 g3")
  .s("sawtooth")
  .off(1/8, x => x.add(12).degradeBy(0.5))
  .gain(0.4)

// With jux
note("c3 eb3 g3")
  .s("triangle")
  .jux(x => x.rev().fast(2))
  .gain(0.4)
```

---

## Common Patterns Reference

### Drum Patterns

| Style | Pattern |
|-------|---------|
| Basic Rock | `s("bd [~ bd] sd bd, hh*8")` |
| House | `s("bd*4, [~ oh]*2, hh*16")` |
| Techno | `s("bd*4, sd*4, hh*16, oh*4")` |
| Hip Hop | `s("bd [~ bd] sd ~, hh [hh ~] hh [hh ~]")` |
| Breakbeat | `s("bd(3,8), sd(5,8), hh(7,16)")` |

### Useful Combinations

```javascript
// Fat bass
note("c2").s("sawtooth").lpf(200).distort(0.2).gain(0.6)

// Soft pad
note("c3 e3 g3").s("sine").attack(0.5).room(0.8).gain(0.4)

// Percussive lead
note("c4 e4 g4").s("square").decay(0.05).sustain(0).gain(0.3)

// Ambient texture
s("space").speed(0.5).room(0.9).gain(0.3)
```

---

## Tips & Tricks

### Mute/Unmute Parts

```javascript
// Use _ prefix to mute
_$: s("bd*4")      // muted
$: s("hh*8")       // playing
```

### Gradual Build-up

```javascript
s("bd*4").gain(sine.slow(16).range(0.1, 1))
```

### Random Variations

```javascript
note("c e g").degradeBy(0.3)           // 30% random removal
note("c|e|g|a")                         // random selection
s("bd*8?0.2").speed(rand.range(0.9, 1.1))  // random speed
```

### Automation

```javascript
// Filter sweep
note("c3").s("sawtooth").cutoff(sine.slow(4).range(200, 4000))

// Panning
note("c3").s("sine").pan(sine.slow(2).range(0, 1))

// Volume
note("c3").s("triangle").gain(sine.range(0.3, 0.7))
```

---

## Additional Resources

- Official REPL: https://strudel.cc/
- Documentation: https://strudel.cc/learn/getting-started/
- Examples: See `songs/` folder for full song examples
- TidalCycles: https://tidalcycles.org/
- Community: Discord, Mastodon (@strudel)
