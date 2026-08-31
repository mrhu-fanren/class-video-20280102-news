"""批量 ASR：17 个新视频 -> transcripts.json"""
import sys, os, json, time
sys.stdout.reconfigure(encoding='utf-8')

from faster_whisper import WhisperModel

DIR = "C:/Users/mr hu/OneDrive/Desktop/新闻/"
NAMES = ['汪承宥','王晨皓','王近菁','王楠','杨俊熙','杨紫彤','杨子贤',
         '叶可心','叶小菀','游紫琪','袁世博','张跃腾','赵思琪','钟沅江',
         '周春言','周纹萱','周垚彤']

OUT = "transcripts.json"
results = {}
if os.path.exists(OUT):
    try:
        results = json.load(open(OUT, encoding='utf-8'))
    except Exception:
        results = {}

print("Loading model...", flush=True)
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Model loaded. Total: %d" % len(NAMES), flush=True)

for i, n in enumerate(NAMES, 1):
    if n in results and results[n].get("text"):
        print("[%d/%d] %s -- cached, skip" % (i, len(NAMES), n), flush=True)
        continue
    p = DIR + n + ".mp4"
    if not os.path.exists(p):
        print("[%d/%d] %s -- MISSING" % (i, len(NAMES), n), flush=True)
        continue
    t0 = time.time()
    try:
        segments, info = model.transcribe(p, language="zh", vad_filter=True,
                                          initial_prompt="以下是普通话新闻播报。")
        text = "".join(s.text for s in segments)
        results[n] = {"text": text, "dur": round(info.duration, 1)}
        print("[%d/%d] %s -- %.0fs audio, took %.0fs" % (i, len(NAMES), n, info.duration, time.time()-t0), flush=True)
        json.dump(results, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    except Exception as e:
        print("[%d/%d] %s -- ERROR: %s" % (i, len(NAMES), n, e), flush=True)

print("=== ALL DONE ===", flush=True)
