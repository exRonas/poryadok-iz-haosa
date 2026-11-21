# 3D-картинки учебного режима

Картинки в `src/course/art/` отрисованы в Blender скриптами из этой папки. Сцены собираются кодом, поэтому всю серию можно перерисовать одной командой, например после смены палитры.

## Что нужно

- Blender 5.3. По умолчанию берётся из Steam: `C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe`. Другой путь задаётся переменной `BLENDER`.
- Видеокарта NVIDIA (OptiX или CUDA). Без неё Cycles считает на процессоре, в разы медленнее.
- Python с Pillow (`pip install pillow`) для перевода PNG в WebP.

## Без Windows и видеокарты

Blender ставится и как модуль Python: `pip install bpy==5.3.0 pillow` (Python 3.13). Тогда вместо `blender -b --factory-startup -P script.py -- …` запускается обёртка, которая сначала импортирует `bpy`:

```
python -c "import bpy, runpy, sys; s = sys.argv[1]; sys.argv = sys.argv[1:]; runpy.run_path(s, run_name='__main__')" tools/render/assets.py -- --asset lesson-clt --out lesson-clt.png
```

Cycles считает на процессоре: картинка урока при 256 сэмплах — от полуминуты до нескольких минут.

## Команды

Всё сразу (около 20 минут, большая часть — анимация):

```
bash tools/render/render_all.sh
```

Одна картинка:

```
blender -b --factory-startup -P tools/render/assets.py -- --asset lesson-center --out lesson-center.png
python tools/render/to_webp.py lesson-center.png src/course/art/lesson-center.webp --width 1100
```

## Файлы

| Файл | Что делает |
|---|---|
| `scene_lib.py` | Cycles, окружение, свет, материалы (хром, графит, тёмный пластик onyx, синее стекло с малиновым краем), примитивы |
| `assets.py` | Сцены: `hero`, обложки курсов `course-*`, картинки уроков `lesson-*` |
| `sprites.py` | Детали для опытов: шарики, столбики, качели, монеты, кубики, плитки клеток, хромовые рамки (`src/course/sprites/`). Их же используют четыре эксперимента |
| `to_webp.py` | PNG → WebP, обрезка прозрачных полей, уменьшение кадров анимации |
| `encode.py` | Кадры → WebM VP9 с прозрачностью через видеоредактор Blender |
| `render_all.sh` | Пересобирает всю серию |

Палитра задана константами в начале `scene_lib.py`: `CENTER`, `EDGE`, `LEFT`, `RIGHT`, `SPARKLE`.
