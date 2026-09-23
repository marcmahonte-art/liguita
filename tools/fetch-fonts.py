"""Télécharge les polices du design system pour l'auto-hébergement.

Le plan v3 §16.2 (tâche 0.3) impose `next/font/local` : les polices doivent être servies
depuis le domaine de Liguita, sans aucun appel à un CDN tiers à l'exécution. C'est un
choix motivé pour un contexte tchadien — un appel réseau vers fonts.gstatic.com depuis
N'Djamena est un point de défaillance de plus, sur un réseau déjà contraint.

Ce script télécharge les fichiers `.woff2` du sous-ensemble `latin`, seul nécessaire au
français, et les dépose dans `apps/web/src/fonts/`.

⚠️ Inter et Plus Jakarta Sans sont des **polices variables** : Google sert un fichier
unique couvrant toute la plage de graisses, et non un fichier par graisse. Le script
détecte ce cas en comparant les URL et n'écrit alors qu'un seul fichier par famille,
déclaré avec une plage de graisses. Sans cette déduplication, on embarquerait quatre fois
le même fichier — 295 Ko au lieu de 74 Ko.

⚠️ `next/font/local` ne gère pas `unicode-range` : le sous-ensemble `latin-ext`
(caractères d'Europe centrale) n'est donc pas embarqué, faute de pouvoir le déclarer.
Il n'est pas utile au français ; un texte en polonais ou en tchèque retomberait sur la
police système.

Usage :
    python tools/fetch-fonts.py
"""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'apps' / 'web' / 'src' / 'fonts'

# Un agent moderne est indispensable : avec un agent ancien, Google renvoie du `.ttf`,
# qui n'est pas compressé et pèserait cinq fois plus lourd.
USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)

FAMILIES = [
    ('Inter', 'inter', [400, 500, 600, 700]),
    ('Plus Jakarta Sans', 'plus-jakarta-sans', [400, 600, 700, 800]),
]

BLOCK_RE = re.compile(
    r"/\*\s*(?P<subset>[\w-]+)\s*\*/\s*"
    r"@font-face\s*\{(?P<body>[^}]*)\}",
    re.MULTILINE,
)
WEIGHT_RE = re.compile(r"font-weight:\s*(\d+)")
URL_RE = re.compile(r"url\((https://[^)]+\.woff2)\)")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310
        return response.read()


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    written: list[tuple[str, int]] = []
    ranges: list[tuple[str, int, int]] = []

    for family, slug, weights in FAMILIES:
        # Syntaxe de l'API CSS v2 : les familles sont séparées par `&`, les poids par `;`.
        query = f'family={family.replace(" ", "+")}:wght@{";".join(map(str, weights))}'
        css_url = f'https://fonts.googleapis.com/css2?{query}&display=swap'
        css = fetch(css_url).decode('utf-8')

        # Le CSS liste les sous-ensembles dans un ordre stable, `latin` en dernier.
        # On ne conserve donc que lui, pour chaque graisse demandée.
        latin_by_weight: dict[int, str] = {}
        for match in BLOCK_RE.finditer(css):
            if match.group('subset') != 'latin':
                continue
            weight_match = WEIGHT_RE.search(match.group('body'))
            url_match = URL_RE.search(match.group('body'))
            if weight_match and url_match:
                latin_by_weight[int(weight_match.group(1))] = url_match.group(1)

        missing = [weight for weight in weights if weight not in latin_by_weight]
        if missing:
            print(f'ABSENT   {family} — sous-ensemble latin introuvable pour {missing}')
            return 1

        distinct_urls = set(latin_by_weight.values())
        payload = fetch(next(iter(distinct_urls)))

        if len(distinct_urls) == 1:
            # Police variable : un seul fichier couvre toute la plage.
            destination = TARGET / f'{slug}.woff2'
            destination.write_bytes(payload)
            written.append((destination.name, len(payload)))
            ranges.append((family, min(weights), max(weights)))
            print(f'OK       {destination.name:<28} {len(payload) / 1024:6.1f} Ko  (variable)')
        else:
            for weight, url in sorted(latin_by_weight.items()):
                data = fetch(url)
                destination = TARGET / f'{slug}-{weight}.woff2'
                destination.write_bytes(data)
                written.append((destination.name, len(data)))
                print(f'OK       {destination.name:<28} {len(data) / 1024:6.1f} Ko')

    print()
    total = sum(size for _, size in written)
    print(f'{len(written)} fichier(s), {total / 1024:.1f} Ko au total.')

    for family, low, high in ranges:
        print(f'Plage de graisses à déclarer pour {family} : weight: {low} {high}')

    print(f'Destination : {TARGET.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
