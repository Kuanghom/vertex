"""Composite walk-cycle sprites onto locked plates and write login MP4s."""
from pathlib import Path
import math
import subprocess
import shutil

import cv2
import numpy as np
from PIL import Image

ASSETS = Path(r"C:\Users\10351\.cursor\projects\e-AiGreate-tmp\assets")
CUTS = ASSETS / "stride-cut"
OUT = Path(r"e:\AiGreate\tmp\vertex\webui\public\assets\login-bg")
FFMPEG = Path(r"C:\Users\10351\Downloads\ykv2mp4\ffmpeg\ffmpeg.exe")

W, H, FPS, SECS = 1280, 720, 30, 8
TOTAL = FPS * SECS
HOLD = 8  # frames per walk pose (~1 stride / sec)


def largest_sprite(rgba):
    alpha = rgba[:, :, 3]
    mask = (alpha > 24).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n <= 1:
        return rgba
    idx = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    keep = labels == idx
    # keep nearby small blobs (detached hair / sleeve) within padding of main bbox
    x, y, w, h, _ = stats[idx]
    pad = 28
    for i in range(1, n):
        if i == idx:
            continue
        xi, yi, wi, hi, area = stats[i]
        if area < 40:
            continue
        cx, cy = xi + wi / 2, yi + hi / 2
        if x - pad <= cx <= x + w + pad and y - pad <= cy <= y + h + pad:
            keep |= labels == i
    out = rgba.copy()
    out[~keep] = 0
    ys, xs = np.where(keep)
    y0, y1 = max(0, ys.min() - 8), min(rgba.shape[0], ys.max() + 9)
    x0, x1 = max(0, xs.min() - 8), min(rgba.shape[1], xs.max() + 9)
    return out[y0:y1, x0:x1]


def load_sprites(prefix):
    sprites = []
    for i in range(1, 5):
        im = Image.open(CUTS / f"{prefix}-stride-{i}-cut.png").convert("RGBA")
        arr = largest_sprite(np.array(im))
        sprites.append(arr)
    # normalize height, feet on bottom
    target_h = max(s.shape[0] for s in sprites)
    norm = []
    for s in sprites:
        scale = target_h / s.shape[0]
        nw, nh = max(1, int(round(s.shape[1] * scale))), target_h
        resized = cv2.resize(s, (nw, nh), interpolation=cv2.INTER_AREA)
        # trim leftover transparent bottom so feet sit on the last opaque row
        rows = np.where(resized[:, :, 3] > 20)[0]
        if len(rows):
            resized = resized[: rows.max() + 1]
        norm.append(resized)
    return norm


def plate_bgr(path):
    img = Image.open(path).convert("RGB")
    arr = np.array(img)
    return cv2.resize(arr[:, :, ::-1], (W, H), interpolation=cv2.INTER_AREA)


def feather(alpha, px=1.2):
    if px <= 0:
        return alpha
    k = max(3, int(round(px * 2)) * 2 + 1)
    return cv2.GaussianBlur(alpha, (k, k), px)


def paste(dst, sprite, x, feet_y, scale, warmth=0.0, opacity=1.0):
    sh, sw = sprite.shape[:2]
    nh, nw = max(1, int(round(sh * scale))), max(1, int(round(sw * scale)))
    spr = cv2.resize(sprite, (nw, nh), interpolation=cv2.INTER_AREA)
    x0 = int(round(x - nw / 2))
    y0 = int(round(feet_y - nh))
    x1, y1 = x0 + nw, y0 + nh
    sx0 = max(0, -x0)
    sy0 = max(0, -y0)
    dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(W, x1), min(H, y1)
    if dx1 <= dx0 or dy1 <= dy0:
        return
    patch = spr[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
    rgb = patch[:, :, :3][:, :, ::-1].astype(np.float32)
    if warmth:
        rgb[:, :, 0] *= 1.0 - warmth * 0.08
        rgb[:, :, 2] *= 1.0 + warmth * 0.12
        rgb = np.clip(rgb, 0, 255)
    a = feather(patch[:, :, 3].astype(np.float32) / 255.0) * float(opacity)
    cx = (dx0 + dx1) / 2
    cy = min(H - 4, feet_y - 2)
    yy, xx = np.mgrid[dy0:dy1, dx0:dx1]
    shadow = np.exp(-(((xx - cx) / max(12.0, nw * 0.22)) ** 2 + ((yy - cy) / 7.0) ** 2)) * 0.28 * opacity
    region = dst[dy0:dy1, dx0:dx1].astype(np.float32)
    region *= (1.0 - shadow[..., None])
    region = rgb * a[..., None] + region * (1.0 - a[..., None])
    dst[dy0:dy1, dx0:dx1] = np.clip(region, 0, 255).astype(np.uint8)


def render(prefix, plate_path, scale, feet_y, x0, x1, warmth, tmp):
    sprites = load_sprites(prefix)
    bg = plate_bgr(plate_path)
    tmp.mkdir(parents=True, exist_ok=True)
    for i, p in enumerate(sorted(tmp.glob("*.png"))):
        p.unlink()
    for f in range(TOTAL):
        t = f / (TOTAL - 1)
        fade = min(1.0, f / 18.0, (TOTAL - 1 - f) / 18.0)
        pose = sprites[(f // HOLD) % 4]
        x = x0 + (x1 - x0) * t
        bob = math.sin((f / HOLD) * math.pi) * 4.0
        frame = bg.copy()
        paste(frame, pose, x, feet_y + bob, scale, warmth, fade)
        cv2.imwrite(str(tmp / f"{f:04d}.png"), frame)
    return tmp


def encode(tmp, mp4, jpg):
    cmd = [
        str(FFMPEG), "-y",
        "-framerate", str(FPS),
        "-i", str(tmp / "%04d.png"),
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "18", "-preset", "medium",
        "-movflags", "+faststart",
        str(mp4),
    ]
    subprocess.check_call(cmd)
    subprocess.check_call([
        str(FFMPEG), "-y", "-i", str(mp4),
        "-frames:v", "1", "-q:v", "3", str(jpg),
    ])


def main():
    work = OUT / "_walk_frames"
    sakura_tmp = render(
        "sakura", ASSETS / "sakura-bg.png",
        scale=0.46, feet_y=668, x0=210, x1=620, warmth=0.35,
        tmp=work / "sakura",
    )
    encode(sakura_tmp, OUT / "anime-sakura.mp4", OUT / "anime-sakura.jpg")
    sea_tmp = render(
        "sea", ASSETS / "sea-bg.png",
        scale=0.40, feet_y=678, x0=200, x1=600, warmth=0.45,
        tmp=work / "sea",
    )
    encode(sea_tmp, OUT / "anime-sea.mp4", OUT / "anime-sea.jpg")
    shutil.rmtree(work, ignore_errors=True)
    print("wrote", OUT / "anime-sakura.mp4", (OUT / "anime-sakura.mp4").stat().st_size)
    print("wrote", OUT / "anime-sea.mp4", (OUT / "anime-sea.mp4").stat().st_size)


if __name__ == "__main__":
    main()
