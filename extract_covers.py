# -*- coding: utf-8 -*-
"""
extract_covers.py — v3：真·人脸检测版
用 OpenCV 4.x Haar 级联检测主播人脸，选人脸最大/最正的帧做封面。
策略：
1. 0~8s 每 0.5s 抽一帧（新闻开头主播出镜）
2. Haar 检测人脸：有人脸 → 按面积+清晰度评分选最佳
3. 无人脸 → 回退到「肤色+亮度+清晰度」评分选帧（保证有封面，且大概率是人物/标题画面）
4. 输出 640px 内 webp
"""
import subprocess, os, sys, glob
import cv2

sys.stdout.reconfigure(encoding='utf-8')
ROOT = r"C:\Users\mr hu\WorkBuddy\2026-07-08-10-21-40"
FFMPEG = os.path.join(ROOT, ".asr-venv", "Lib", "site-packages", "imageio_ffmpeg", "binaries", "ffmpeg-win-x86_64-v7.1.exe")
VID_DIR = os.path.join(ROOT, "site", "videos")
OUT_DIR = os.path.join(ROOT, "site", "covers")
os.makedirs(OUT_DIR, exist_ok=True)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
if face_cascade.empty():
    print("FATAL: cascade load failed")
    sys.exit(1)

def grab_frame(video, t):
    out = os.path.join(OUT_DIR, "_tmp_frame.jpg")
    r = subprocess.run([FFMPEG, "-y", "-ss", str(t), "-i", video, "-frames:v", "1",
                        "-vf", "scale=640:640:force_original_aspect_ratio=decrease", "-q:v", "4", out],
                       capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if r.returncode != 0 or not os.path.exists(out):
        return None
    img = cv2.imread(out)
    if os.path.exists(out):
        try: os.remove(out)
        except: pass
    return img

def detect_faces(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(50, 50))
    return faces

def face_frame_score(img, faces):
    """有人脸时：面积大 + 清晰 + 人脸居中"""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_64F).var()
    clarity = min(1.0, lap / 500.0)
    best_area = 0
    best_center = 0.5
    for (x, y, fw, fh) in faces:
        area = fw * fh
        if area > best_area:
            best_area = area
            cx = (x + fw / 2) / w
            cy = (y + fh / 2) / h
            best_center = max(0, 1 - (abs(cx - 0.5) + abs(cy - 0.4)))
    area_ratio = best_area / (w * h)
    return clarity * 0.3 + min(1.0, area_ratio * 6) * 0.5 + best_center * 0.2, area_ratio

def fallback_score(img):
    """无人脸回退：肤色+亮度+清晰度+居中"""
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = gray.mean()
    if brightness < 40 or brightness > 235:
        return -0.5
    lap = cv2.Laplacian(gray, cv2.CV_64F).var()
    clarity = min(1.0, lap / 400.0)
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    skin = cv2.inRange(ycrcb, (0, 133, 77), (255, 173, 127))
    skin_ratio = skin.mean() / 255.0
    if skin_ratio < 0.03:
        skin_score = -0.3
    elif skin_ratio < 0.08:
        skin_score = skin_ratio / 0.08
    elif skin_ratio <= 0.5:
        skin_score = 1.0
    else:
        skin_score = max(0, 1 - (skin_ratio - 0.5) / 0.3)
    return clarity * 0.35 + skin_score * 0.45 + 0.2 * 0.5

def main():
    vids = sorted(glob.glob(os.path.join(VID_DIR, "ep*.mp4")),
                  key=lambda p: int(os.path.basename(p)[2:4]))
    ok, face_ok, fallback, fail = 0, 0, 0, 0
    fallback_list = []
    for v in vids:
        ep = os.path.basename(v)[2:4]
        out_webp = os.path.join(OUT_DIR, f"ep{ep}.webp")
        best_img = None
        best_face = None
        best_fb = None
        best_fs, best_ar = -10, 0
        best_fb_score = -10
        for t in [i * 0.5 for i in range(17)]:  # 0~8s
            img = grab_frame(v, t)
            if img is None:
                continue
            faces = detect_faces(img)
            if len(faces) > 0:
                s, ar = face_frame_score(img, faces)
                if s > best_fs:
                    best_fs, best_ar, best_face = s, ar, img
            else:
                fb = fallback_score(img)
                if fb > best_fb_score:
                    best_fb_score, best_fb = fb, img
        if best_face is not None:
            chosen, tag = best_face, f"FACE area={best_ar*100:.0f}%"
            face_ok += 1
        elif best_fb is not None:
            chosen, tag = best_fb, "FALLBACK(无人脸)"
            fallback += 1
            fallback_list.append(ep)
        else:
            fail += 1
            print(f"ep{ep}: FAIL")
            continue
        cv2.imwrite(out_webp, chosen, [cv2.IMWRITE_WEBP_QUALITY, 84])
        sz = os.path.getsize(out_webp) / 1024
        h, w = chosen.shape[:2]
        ok += 1
        print(f"ep{ep}: {w}x{h} {tag} -> {sz:.0f}KB")
    print("=" * 60)
    print(f"完成: {ok} 成功 ({face_ok} 含人脸, {fallback} 回退), {fail} 失败")
    if fallback_list:
        print("回退(无人脸)期号:", ",".join(fallback_list))

if __name__ == "__main__":
    main()
