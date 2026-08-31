"""批量压缩：桌面新闻视频 -> site/videos/epNN.mp4（全部 <25MiB + faststart）"""
import subprocess, os, json, sys, time
import imageio_ffmpeg

sys.stdout.reconfigure(encoding='utf-8')
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SRC = "C:/Users/mr hu/OneDrive/Desktop/新闻/"
DST = "C:/Users/mr hu/WorkBuddy/2026-07-08-10-21-40/site/videos/"
PROBE = json.load(open("probe_result.json", encoding="utf-8"))

# 拼音序 ep26 - ep42
EP = {
    'ep26': '汪承宥', 'ep27': '王晨皓', 'ep28': '王近菁', 'ep29': '王楠',
    'ep30': '杨俊熙', 'ep31': '杨紫彤', 'ep32': '杨子贤', 'ep33': '叶可心',
    'ep34': '叶小菀', 'ep35': '游紫琪', 'ep36': '袁世博', 'ep37': '张跃腾',
    'ep38': '赵思琪', 'ep39': '钟沅江', 'ep40': '周春言', 'ep41': '周纹萱',
    'ep42': '周垚彤',
}

TARGET_MB = 18.0   # 目标（留余量，硬上限 25MiB）
LIMIT_MB = 24.0

for ep in sorted(EP.keys()):
    name = EP[ep]
    info = PROBE.get(name)
    if not info:
        print("%s %s -- NO PROBE DATA" % (ep, name), flush=True); continue

    src = SRC + name + ".mp4"
    dst = DST + ep + ".mp4"
    dur, w, h, mb = info['dur'], info['w'], info['h'], info['mb']
    t0 = time.time()

    def run(cmd):
        return subprocess.run(cmd, capture_output=True, text=True,
                              encoding='utf-8', errors='ignore')

    if mb < LIMIT_MB:
        # 体积达标：仅重封装加 faststart，不重编码
        r = run([FFMPEG, '-y', '-i', src, '-c', 'copy', '-movflags', '+faststart', dst])
        tag = "copy+faststart"
    else:
        # 计算目标视频码率
        v_kbps = int(TARGET_MB * 8 * 1024 / dur - 96)
        v_kbps = max(180, v_kbps)
        # 分辨率：只缩不放
        maxdim = max(w, h)
        if maxdim > 1920:
            vf = "scale=1280:-2" if w >= h else "scale=-2:1280"
        elif maxdim > 960:
            vf = "scale=960:-2" if w >= h else "scale=-2:960"
        else:
            vf = None
        scale = (vf + ",format=yuv420p") if vf else "format=yuv420p"
        cmd = [FFMPEG, '-y', '-i', src, '-vf', scale,
               '-c:v', 'libx264', '-b:v', '%dk' % v_kbps, '-preset', 'veryfast',
               '-profile:v', 'main', '-pix_fmt', 'yuv420p',
               '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', dst]
        r = run(cmd)
        tag = "encode@%dkbps %s" % (v_kbps, vf or "orig-res")

    ok = os.path.exists(dst)
    out_mb = os.path.getsize(dst) / 1048576 if ok else -1
    status = "OK" if (ok and out_mb < LIMIT_MB) else "!!OVER!!"
    print("%s %-4s %6.1fMiB -> %6.1fMiB  %-28s %.0fs  %s"
          % (ep, name, mb, out_mb, tag, time.time()-t0, status), flush=True)

print("=== COMPRESS DONE ===", flush=True)
