"""Valide la syntaxe PostgreSQL des migrations et du seed Liguita.

Aucun serveur PostgreSQL n'est disponible dans cet environnement : ce script utilise
`pglast`, qui embarque le véritable analyseur de PostgreSQL (`libpg_query`). Il ne
remplace pas l'exécution réelle — les contraintes, les déclencheurs et les politiques
RLS ne sont pas évalués — mais il attrape toute faute de syntaxe, ce qui est la classe
d'erreur la plus probable dans du SQL écrit sans pouvoir le lancer.

Usage :
    python tools/validate-sql.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from pglast import parse_sql

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    *sorted((ROOT / 'packages' / 'db' / 'supabase' / 'migrations').glob('*.sql')),
    ROOT / 'packages' / 'db' / 'supabase' / 'seed.sql',
]


def main() -> int:
    failures = 0
    total_statements = 0

    for path in TARGETS:
        name = str(path.relative_to(ROOT))
        if not path.exists():
            print(f'ABSENT   {name}')
            failures += 1
            continue

        sql = path.read_text(encoding='utf-8')
        try:
            statements = parse_sql(sql)
        except Exception as error:  # noqa: BLE001 — l'analyseur lève des types variés
            print(f'ÉCHEC    {name}')
            print(f'         {type(error).__name__}: {error}')
            failures += 1
            continue

        total_statements += len(statements)
        print(f'OK       {name:<58} {len(statements):>3} instructions')

    print()
    if failures:
        print(f'{failures} fichier(s) en échec.')
        return 1

    print(f'{len(TARGETS)} fichiers valides, {total_statements} instructions analysées.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
