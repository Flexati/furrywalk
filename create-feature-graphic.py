#!/usr/bin/env python3
"""Crea feature graphic 1024x500 px per Play Store da screenshot verticali"""

from PIL import Image
import os

SCREENSHOTS_DIR = "/home/locoomo/Scrivania/building factory/saas_app/smart_walk_app/passeggiata-furba/assets/screenshots"
OUTPUT_PATH = "/home/locoomo/Scrivania/building factory/saas_app/smart_walk_app/passeggiata-furba/assets/feature-graphic.jpg"

# Dimensioni target per Play Store feature graphic
TARGET_WIDTH = 1024
TARGET_HEIGHT = 500

# Prendi il primo screenshot
input_path = os.path.join(SCREENSHOTS_DIR, "photo_5974549549307072010_y.jpg")

print(f"Carico: {input_path}")

# Apri immagine
img = Image.open(input_path)
print(f"Originale: {img.size[0]}x{img.size[1]} - {img.mode}")

# Calcola il crop centrale per ottenere aspect ratio 1024:500 (2.048:1)
orig_w, orig_h = img.size
target_ratio = TARGET_WIDTH / TARGET_HEIGHT  # 2.048

# L'immagine è verticale (561x1162), quindi crop una striscia orizzontale dal centro
crop_height = int(orig_w / target_ratio)  # Quanto alto deve essere il crop per avere ratio corretta
crop_y_start = (orig_h - crop_height) // 2

# Ritaglia la parte centrale
left = 0
top = crop_y_start
right = orig_w
bottom = crop_y_start + crop_height

cropped = img.crop((left, top, right, bottom))
print(f"Croppato: {cropped.size[0]}x{cropped.size[1]}")

# Ridimensiona esattamente a 1024x500
resized = cropped.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
print(f"Ridimensionato: {resized.size[0]}x{resized.size[1]}")

# Salva come JPEG di alta qualità
resized.save(OUTPUT_PATH, "JPEG", quality=95, optimize=True)
print(f"Salvato: {OUTPUT_PATH}")

# Verifica il file creato
import subprocess
result = subprocess.run(["identify", OUTPUT_PATH], capture_output=True, text=True)
print(f"Verifica: {result.stdout.strip()}")