"""Gera o mapa do retrato da Clave para o efeito 2.5D (public/brand/clave-depth.png).

Canais: R = profundidade (0 = fundo, 1 = mais perto), G = máscara da mão + palheta
(balanço), B = máscara do tronco/violão (respiração). Feito à mão a partir das cores
e de formas aproximadas do rosto, cabelo, tronco, violão e mão — não precisa de modelo de IA.

Uso: python scripts/gen_clave_depth.py
"""

import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_opening, gaussian_filter

SRC = "public/brand/clave.webp"
OUT = "public/brand/clave-depth.png"

img = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W, _ = img.shape
R, G, B = img[..., 0], img[..., 1], img[..., 2]
lum = 0.3 * R + 0.59 * G + 0.11 * B
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def ellipse(cx, cy, rx, ry):
    """Domo 0–1 dentro da elipse (1 no centro, 0 na borda)."""
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    return np.clip(1 - d, 0, 1) ** 0.5


inside_art = ((xx - W / 2) ** 2 + (yy - H / 2) ** 2) < (0.49 * W) ** 2
non_bg = (lum > 20) & inside_art
skin = (R > 190) & (G > 105) & (G < 205) & (B < 150) & ((R - B) > 80)
orange = (R > 190) & (G < 125) & (B < 70)
mustard = (R > 170) & (G > 115) & (B < 110) & ~skin

depth = np.zeros((H, W), np.float32)

# Cabelo (atrás de tudo que é corpo): domo grande em volta da cabeça.
hair = ellipse(640, 440, 490, 480)
depth = np.where(non_bg, 0.18 + 0.22 * hair, depth)

# Tronco / camisa / pescoço.
torso_zone = (yy > 620) & non_bg & ((xx > 230) | mustard | skin)
torso_dome = ellipse(640, 980, 520, 420)
depth = np.where(torso_zone, 0.45 + 0.12 * torso_dome, depth)

# Rosto: pele dentro da elipse da cabeça + o miolo inteiro (olhos, boca e sobrancelhas são
# escuros, mas precisam se mover junto com o rosto, senão "afundam").
face_zone = ellipse(650, 430, 235, 300) > 0
face_core = ellipse(652, 425, 205, 262) > 0
face = (skin & face_zone) | face_core
depth = np.where(face, 0.55 + 0.3 * ellipse(650, 430, 235, 300) + 0.08 * ellipse(655, 455, 60, 70), depth)

# Violão (parte de baixo): mais perto conforme desce.
guitar_zone = (yy > 930) & (xx > 200) & (orange | (lum < 90)) & non_bg
depth = np.where(guitar_zone, 0.78 + 0.15 * np.clip((yy - 930) / 320, 0, 1), depth)

# Antebraço: liga a mão ao tronco sem degrau.
arm = (xx > 85) & (xx < 340) & (yy > 820) & (yy < 1000) & (skin | mustard)
depth = np.where(arm, 0.6 + 0.3 * np.clip((1000 - yy) / 180, 0, 1), depth)

# Mão + palheta: o ponto mais próximo.
hand_box = (xx > 90) & (xx < 400) & (yy > 470) & (yy < 880) & ~((xx > 320) & (yy > 760))
hand = hand_box & (skin | orange)
hand = binary_opening(binary_closing(hand, iterations=3), iterations=2)
depth = np.where(hand, 0.95, depth)

depth = gaussian_filter(depth, 4)
# Peso do balanço: zero no punho (pivô) e cheio na palheta.
pivot = np.array([195.0, 870.0])
reach = np.clip(((yy - pivot[1]) * -1) / 260, 0, 1)
hand_mask = gaussian_filter(hand.astype(np.float32), 3) * reach
body_mask = gaussian_filter((torso_zone | guitar_zone).astype(np.float32), 8)

out = np.stack([depth, np.clip(hand_mask, 0, 1), np.clip(body_mask, 0, 1)], -1)
img_out = Image.fromarray((out * 255).astype(np.uint8), "RGB").resize((W // 2, H // 2), Image.LANCZOS)
img_out.save(OUT, optimize=True)

# Olhos: caixa dos pixels escuros (íris + cílios) em torno de cada olho, para o piscar.
for name, (x0, x1, y0, y1) in {"left": (495, 625, 345, 405), "right": (685, 815, 318, 385)}.items():
    m = lum[y0:y1, x0:x1] < 70
    ys, xs = np.nonzero(m)
    print(name, "x", x0 + xs.min(), x0 + xs.max(), "y", y0 + ys.min(), y0 + ys.max())
print("salvo", OUT, img_out.size)
