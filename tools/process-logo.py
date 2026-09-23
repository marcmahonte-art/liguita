"""
Préparation des ressources de marque Liguita.

Rôle
----
Produire, depuis les fichiers PNG fournis dans `logo/`, deux ressources propres :

  · `apps/web/public/logo-liguita.png` — le logotype détouré, fond transparent,
    marges rognées. Utilisable aussi bien sur fond blanc que sur surface teintée.

  · `apps/web/src/app/icon.png` — une favicon carrée. Un logotype complet est
    illisible à 16 px : il faut un signet.

Pourquoi ce script existe
-------------------------
Les fichiers d'origine portent un fond blanc opaque et une large réserve de marges.
Posé sur autre chose que du blanc, le logo affiche un rectangle visible. Rogner et
détourer à la main serait à refaire à chaque nouvelle version de la marque ; le script
rend l'opération reproductible.

Ce qu'il fait
-------------
1. Analyse le profil d'encre pour trouver la boîte englobante réelle et les colonnes
   vides, afin de couper le signet sans deviner de coordonnées.
2. Rend transparents les pixels proches du blanc, avec un seuil progressif pour éviter
   l'effet de crénelage dur sur les bords des lettres.
3. Rogne les marges et enregistre.

Usage
-----
    python tools/process-logo.py
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    print("Pillow est requis : pip install Pillow", file=sys.stderr)
    raise

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "logo" / "petit logo.png"
OUT_LOGO = ROOT / "apps" / "web" / "public" / "logo-liguita.png"
OUT_ICON = ROOT / "apps" / "web" / "src" / "app" / "icon.png"

# Seuils de détourage. En dessous de `SOLID_BELOW`, le pixel est considéré comme du
# fond et devient totalement transparent. Au-dessus de `CLEAR_ABOVE`, il est considéré
# comme de l'encre et reste opaque. Entre les deux, la transparence est interpolée :
# c'est ce qui évite l'escalier sur les bords arrondis des lettres.
SOLID_BELOW = 236
CLEAR_ABOVE = 252


def is_ink(pixel: tuple[int, int, int, int]) -> bool:
    """Vrai si le pixel n'est pas du fond blanc."""
    r, g, b, a = pixel
    if a < 32:
        return False
    return not (r >= SOLID_BELOW and g >= SOLID_BELOW and b >= SOLID_BELOW)


def detour(source: Image.Image) -> Image.Image:
    """Rend le fond transparent avec un seuil progressif."""
    image = source.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Luminosité perçue : un fond gris clair doit aussi disparaître.
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b

            if luma >= CLEAR_ABOVE:
                pixels[x, y] = (r, g, b, 0)
            elif luma > SOLID_BELOW:
                # Interpolation linéaire entre les deux seuils.
                ratio = (CLEAR_ABOVE - luma) / (CLEAR_ABOVE - SOLID_BELOW)
                pixels[x, y] = (r, g, b, int(a * ratio))

    return image


def bounding_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Boîte englobante du contenu non transparent."""
    box = image.getbbox()
    if box is None:
        raise SystemExit("L'image est entièrement transparente : rien à détourer.")
    return box


def column_profile(image: Image.Image, box: tuple[int, int, int, int]) -> list[int]:
    """Nombre de pixels d'encre par colonne, dans la boîte englobante."""
    left, top, right, bottom = box
    pixels = image.load()
    profile: list[int] = []

    for x in range(left, right):
        count = 0
        for y in range(top, bottom):
            if pixels[x, y][3] > 128:
                count += 1
        profile.append(count)

    return profile


def main() -> int:
    if not SOURCE.exists():
        print(f"Source introuvable : {SOURCE}", file=sys.stderr)
        return 1

    original = Image.open(SOURCE)
    print(f"Source            : {SOURCE.name} — {original.size[0]}×{original.size[1]}")

    transparent = detour(original)
    box = bounding_box(transparent)
    print(
        "Boîte englobante  : "
        f"x {box[0]}..{box[2]}, y {box[1]}..{box[3]} "
        f"({box[2] - box[0]}×{box[3] - box[1]})"
    )

    profile = column_profile(transparent, box)
    gaps: list[tuple[int, int]] = []
    run_start: int | None = None
    for index, count in enumerate(profile):
        if count == 0:
            if run_start is None:
                run_start = index
        elif run_start is not None:
            gaps.append((run_start + box[0], index + box[0]))
            run_start = None
    if run_start is not None:
        gaps.append((run_start + box[0], box[2]))

    print(f"Colonnes vides     : {len(gaps)}")
    for start, end in gaps[:10]:
        print(f"  · x {start}..{end}  (largeur {end - start})")

    # ------------------------------------------------------------------ #
    # Logotype complet                                                    #
    # ------------------------------------------------------------------ #
    logo = transparent.crop(box)
    logo.save(OUT_LOGO, optimize=True)
    print(f"\nLogotype          : {OUT_LOGO.relative_to(ROOT)} — {logo.size[0]}×{logo.size[1]}")

    # ------------------------------------------------------------------ #
    # Favicon carrée                                                      #
    # ------------------------------------------------------------------ #
    # Un logotype complet est illisible à 16 px : il faut un signet.
    #
    # ⚠️ Le logotype ne se découpe PAS proprement. La queue de la punaise se prolonge
    # sans rupture dans le « n » : l'analyse ne trouve aucune colonne vide entre les
    # deux (les seules colonnes vides sont entre « i » et « g », puis entre « i » et
    # « t »). Toute coupe verticale tranche donc un trait en plein milieu.
    #
    # La moins mauvaise coupe est retenue : la punaise entière, plus le début de
    # l'arche. L'ensemble se lit comme une punaise de localisation sur un tracé, ce qui
    # reste cohérent avec la marque. Une découpe franchement propre exigerait un signet
    # carré fourni par le graphiste — ce script ne peut pas l'inventer.
    width, height = logo.size
    mark_width = min(300, width)
    mark = logo.crop((0, 0, mark_width, height))

    # Rendu carré, avec une marge interne pour que le signet ne touche pas les bords.
    side = max(mark.size)
    padded = int(side * 1.1)
    canvas = Image.new("RGBA", (padded, padded), (255, 255, 255, 0))
    canvas.paste(mark, ((padded - mark.size[0]) // 2, (padded - mark.size[1]) // 2), mark)
    canvas = canvas.resize((512, 512), Image.LANCZOS)
    canvas.save(OUT_ICON, optimize=True)
    print(f"Signet            : {OUT_ICON.relative_to(ROOT)} — 512×512")
    print("  ⚠️  Signet provisoire : découpe de la punaise. Un carré dédié est attendu.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
