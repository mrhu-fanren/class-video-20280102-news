# -*- coding: utf-8 -*-
"""
extract_covers.py — v4：全片扫描版（用户反馈很多封面不是人脸）
修复：
1. 之前只在 0~8s 采样，片头/黑屏/新闻画面导致抽错帧
2. 改为流式读取整个视频前 90 秒，每 0.75s 一帧
3. Haar 正面 + 侧面级联组合检测，参数放宽（minNeighbors=3, minSize=40）
4. 选人脸面积占比最大的帧
"""
import os, sys, glob
import cv2

sys.stdout.reconfigure(encoding='utf-8')
ROOT = r"C:\Users\mr hu\WorkBuddy\2026-07-08-10-21-40"
VID_DIR = os.path.join(ROOT, "site", "videos")
OUT_DIR = os.path.join(ROOT, "site", "covers")
os.makedirs(OUT_DIR, exist_ok=True)

cascade_dir = cv2.data.haarcascades
front = cv2.CascadeClassifier(cascade_dir + "haarcascade_frontalface_default.xml")
profile = cv2.CascadeClassifier(cascade_dir + "haarcascade_profileface.xml")
if front.empty():
    print("FATAL: cascade load failed")
    sys.exit(1)

def detect_faces(img):
    """正面 + 侧面（左右翻转）检测"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = front.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=3, minSize=(40, 40))
    if len(faces) == 0:
        faces = profile.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=3, minSize=(40, 40))
    if len(faces) == 0:
        gray_flip = cv2.flip(gray, 1)
        faces = profile.detectMultiScale(gray_flip, scaleFactor=1.08, minNeighbors=3, minSize=(40, 40))
        # 翻转回原坐标
        w = img.shape[1]
        faces = [(w - x - fw, y, fw, fh) for (x, y, fw, fh) in faces]
    return faces

def best_face_ratio(img, faces):
    h, w = img.shape[:2]
    if len(faces) == 0:
        return 0
    return max(fw * fh for (x, y, fw, fh) in faces) / (w * h)

def main():
    vids = sorted(glob.glob(os.path.join(VID_DIR, "ep*.mp4")),
                  key=lambda p: int(os.path.basename(p)[2:4]))
    face_ok, fail = 0, 0
    low_list = []
    for v in vids:
        ep = os.path.basename(v)[2:4]
        cap = cv2.VideoCapture(v)
        if not cap.isOpened():
            print(f"ep{ep}: CANNOT OPEN")
            fail += 1
            continue
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        dur = total / fps
        # 采样前 90 秒（或整片），每 0.75s 一帧
        scan_end = min(dur, 90)
        step = max(1, int(fps * 0.75))
        max_frames = int(fps * scan_end)
        best_img, best_ratio, best_t = None, 0, -1
        frame_idx = 0
        while frame_idx < max_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ok, img = cap.read()
            if not ok:
                break
            # 缩小以加速（宽度 480）
            hh, ww = img.shape[:2]
            if ww > 480:
                scale = 480 / ww
                img_small = cv2.resize(img, (480, int(hh * scale)))
            else:
                img_small = img
            faces = detect_faces(img_small)
            ratio = best_face_ratio(img_small, faces)
            if ratio > best_ratio:
                best_ratio = ratio
                best_img = img  # 用原图（全分辨率）
                best_t = frame_idx / fps
            frame_idx += step
        cap.release()
        if best_img is None or best_ratio < 0.03:
            fail += 1
            low_list.append(ep)
            print(f"ep{ep}: LOW ({best_ratio*100:.1f}%) t={best_t:.0f}s")
            # 也保存一帧兜底
            if best_img is not None:
                hh, ww = best_img.shape[:2]
                if ww > 640:
                    scale = 640 / ww
                    best_img = cv2.resize(best_img, (640, int(hh * scale)))
                cv2.imwrite(os.path.join(OUT_DIR, f"ep{ep}.webp"), best_img, [cv2.IMWRITE_WEBP_QUALITY, 84])
            continue
        # 保存：缩到 640 内
        hh, ww = best_img.shape[:2]
        if ww > 640:
            scale = 640 / ww
            best_img = cv2.resize(best_img, (640, int(hh * scale)))
        cv2.imwrite(os.path.join(OUT_DIR, f"ep{ep}.webp"), best_img, [cv2.IMWRITE_WEBP_QUALITY, 84])
        face_ok += 1
        sz = os.path.getsize(os.path.join(OUT_DIR, f"ep{ep}.webp")) // 1024
        print(f"ep{ep}: FACE {best_ratio*100:.0f}% t={best_t:.0f}s -> {sz}KB")
    print("=" * 60)
    print(f"完成: {face_ok} 含人脸, {fail} 低/失败")
    if low_list:
        print("低人脸期号:", ",".join(low_list))

if __name__ == "__main__":
    main()
