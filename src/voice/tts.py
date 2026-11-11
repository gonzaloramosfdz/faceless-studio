"""Voice stage. Input: job.json with lines[{id,text}]. Output: one WAV per line + durations.json."""
import json, sys, os
import soundfile as sf
from kokoro_onnx import Kokoro

def main(job_path, out_dir):
    job = json.load(open(job_path))
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    k = Kokoro(os.path.join(root, "models", "kokoro-v1.0.onnx"), os.path.join(root, "models", "voices-v1.0.bin"))
    voice = job.get("voice", "am_michael")
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for line in job["lines"]:
        samples, sr = k.create(line["text"], voice=voice, speed=job.get("speed", 1.05), lang="en-us")
        path = os.path.join(out_dir, f"{line['id']}.wav")
        sf.write(path, samples, sr)
        out[line["id"]] = {"file": path, "seconds": len(samples) / sr}
    json.dump(out, open(os.path.join(out_dir, "durations.json"), "w"), indent=1)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
