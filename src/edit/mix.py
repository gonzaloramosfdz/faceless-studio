"""Edit stage (audio). Input: timeline.json. Output: audio.wav with voice, SFX and a generated music bed.

SFX and music are synthesized here, so there is nothing to license.
"""
import json, sys
import numpy as np
import soundfile as sf

SR = 48000

def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)

def tick():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return 0.5 * np.sin(2 * np.pi * 1100 * t) * env(n, 0.001, 0.015)

def pop():
    n = int(0.14 * SR); t = np.arange(n) / SR
    f = 420 + 700 * (t / t[-1])
    return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.05)

def chime():
    n = int(1.2 * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for i, f in enumerate([659.25, 987.77, 1318.5]):
        d = int(i * 0.09 * SR)
        out[d:] += 0.3 * np.sin(2 * np.pi * f * t[: n - d]) * env(n - d, 0.002, 0.35)
    return out

def music(seconds, seed):
    """Soft pad + plucked arpeggio over a four-chord loop. Key, tempo and progression depend on the seed."""
    r = np.random.default_rng(seed)
    root = 220.0 * 2 ** (r.integers(-3, 4) / 12)
    progs = [[0, 8, 3, 10], [0, 5, 8, 7], [0, 3, 8, 10], [0, 10, 8, 7]]  # minor-key loops, in semitones
    prog = progs[r.integers(len(progs))]
    bpm = int(r.integers(78, 96)); beat = 60 / bpm
    n = int(seconds * SR); out = np.zeros(n)
    bar = 4 * beat; i = 0
    while i * bar < seconds:
        base = root * 2 ** (prog[i % 4] / 12)
        minor = prog[i % 4] in (0, 5, 7)
        chord = [base, base * 2 ** ((3 if minor else 4) / 12), base * 2 ** (7 / 12)]
        s = int(i * bar * SR); m = min(int(bar * SR) + int(0.4 * SR), n - s)
        t = np.arange(m) / SR
        e = np.minimum(1, t / 0.5) * np.minimum(1, (m / SR - t) / 0.5).clip(0)
        for f in chord:
            out[s:s + m] += 0.10 * e * (np.sin(2 * np.pi * f / 2 * t) + 0.4 * np.sin(2 * np.pi * f * t))
        for k in range(8):
            f = chord[[0, 1, 2, 1][k % 4]] * 2
            ps = s + int(k * beat / 2 * SR); pm = min(int(0.5 * SR), n - ps)
            if pm > 0:
                out[ps:ps + pm] += 0.07 * np.sin(2 * np.pi * f * np.arange(pm) / SR) * env(pm, 0.004, 0.16)
        i += 1
    fade = int(1.0 * SR)
    out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
    return out

def place(dst, src, at, gain=1.0):
    s = int(at * SR); m = min(len(src), len(dst) - s)
    if m > 0: dst[s:s + m] += gain * src[:m]

def main(timeline_path, out_path, seed):
    tl = json.load(open(timeline_path)); fps = tl["fps"]
    total = tl["durationInFrames"] / fps
    voice = np.zeros(int(total * SR) + SR)
    for line in tl["lines"]:
        x, sr = sf.read(line["audio"], dtype="float32")
        if x.ndim > 1: x = x.mean(axis=1)
        if sr != SR:
            x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
        place(voice, x, line["from"] / fps)
    voice *= 0.85 / max(1e-6, np.abs(voice).max())
    fx = np.zeros_like(voice)
    sounds = {"tick": tick(), "pop": pop(), "chime": chime()}
    for e in tl["sfx"]:
        place(fx, sounds[e["type"]], e["frame"] / fps, 0.55)
    bed = music(len(voice) / SR, seed)[: len(voice)]
    mix = voice + fx + 0.32 * bed
    mix = mix[: int(total * SR)]
    mix = np.tanh(mix * 1.1) * 0.9
    sf.write(out_path, np.stack([mix, mix], axis=1), SR, subtype="PCM_16")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1)
