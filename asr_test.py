import sys, io, time, os
sys.stdout.reconfigure(encoding='utf-8')

from faster_whisper import WhisperModel

name = sys.argv[1] if len(sys.argv) > 1 else "游紫琪"
src = "C:/Users/mr hu/OneDrive/Desktop/新闻/" + name + ".mp4"

print("Loading model...", flush=True)
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Model loaded.", flush=True)

t0 = time.time()
segments, info = model.transcribe(src, language="zh", vad_filter=True)
print("Duration: %.1fs" % info.duration, flush=True)

text_parts = []
for seg in segments:
    text_parts.append(seg.text)
text = "".join(text_parts)
print("---- TRANSCRIPT ----")
print(text)
print("---- time: %.1fs ----" % (time.time() - t0))
