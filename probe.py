"""读取视频元信息（时长/分辨率/码率），用于计算压缩参数。"""
import subprocess, json, sys, os
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
DIR = "C:/Users/mr hu/OneDrive/Desktop/新闻/"
NAMES = ['叶可心','叶小菀','周垚彤','周春言','周纹萱','张跃腾','杨俊熙','杨子贤',
         '杨紫彤','汪承宥','游紫琪','王晨皓','王楠','王近菁','袁世博','赵思琪','钟沅江']

out = {}
for n in NAMES:
    p = DIR + n + ".mp4"
    if not os.path.exists(p):
        print(n, "MISSING"); continue
    r = subprocess.run([FFMPEG, '-i', p], capture_output=True, text=True, encoding='utf-8', errors='ignore')
    info = r.stderr
    dur = None; res = None; w=h=None
    for line in info.splitlines():
        line = line.strip()
        if 'Duration:' in line:
            try:
                d = line.split('Duration:')[1].split(',')[0].strip()
                hh,mm,ss = d.split(':')
                dur = int(hh)*3600 + int(mm)*60 + float(ss)
            except Exception: pass
        if ' Video:' in line and 'Stream' in line:
            import re
            m = re.search(r'(\d{3,5})x(\d{3,5})', line)
            if m:
                w, h = int(m.group(1)), int(m.group(2))
    mb = os.path.getsize(p)/1048576
    out[n] = {'dur': dur, 'w': w, 'h': h, 'mb': round(mb,1)}
    print("%-6s %6.1fs  %sx%s  %8.1fMiB" % (n, dur or -1, w, h, mb), flush=True)

with open('probe_result.json','w',encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
