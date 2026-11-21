#!/usr/bin/env bash
# Перерисовать все 3D-картинки учебного режима. Запуск из корня проекта: bash tools/render/render_all.sh
# Нужны Blender 5.3 (путь — в BLENDER) и Python с Pillow.
set -euo pipefail
BLENDER="${BLENDER:-/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
WORK="$ROOT/.superpowers/render"
ART="$ROOT/src/course/art"
mkdir -p "$WORK/frames" "$WORK/frames960" "$ART"

render() { "$BLENDER" -b --factory-startup -P "$ROOT/tools/render/assets.py" -- "$@" 2>&1 | grep -E "WROTE|FRAME|MISSING|Traceback" || true; }

for asset in hero course-descriptive course-distributions course-limits course-montecarlo lesson-sample lesson-center lesson-spread lesson-outliers lesson-bernoulli lesson-moments lesson-walk lesson-normal lesson-lln lesson-noise lesson-clt lesson-chaos lesson-share lesson-area lesson-precision lesson-indicator; do
  render --asset "$asset" --out "$WORK/$asset.png" --samples 256
done
python "$ROOT/tools/render/to_webp.py" "$WORK/hero.png" "$ART/hero.webp" --width 1200 --no-trim
for asset in course-descriptive course-distributions course-limits course-montecarlo; do
  python "$ROOT/tools/render/to_webp.py" "$WORK/$asset.png" "$ART/$asset.webp" --width 900
done
for asset in lesson-sample lesson-center lesson-spread lesson-outliers lesson-bernoulli lesson-moments lesson-walk lesson-normal lesson-lln lesson-noise lesson-clt lesson-chaos lesson-share lesson-area lesson-precision lesson-indicator; do
  python "$ROOT/tools/render/to_webp.py" "$WORK/$asset.png" "$ART/$asset.webp" --width 1100
done

# Анимация шапки: 144 кадра (6 с при 24 к/с), бесшовный цикл; около 15 минут на RTX 5060 Ti.
render --asset hero --frames 144 --frame-dir "$WORK/frames" --samples 96 --res 1200x900
python "$ROOT/tools/render/to_webp.py" --frames "$WORK/frames" "$WORK/frames960" --width 960
"$BLENDER" -b --factory-startup -P "$ROOT/tools/render/encode.py" -- "$WORK/frames960" "$ART/hero.webm" 24 1800 2>&1 | grep -E "ENCODED|Traceback" || true
du -ch "$ART"/* | tail -1
