#!/usr/bin/env python3
"""
Liguita — build du plan d'implementation.

Assemble les parties Markdown puis genere une version HTML autonome,
stylee avec les tokens du design system canonique Liguita (theme clair).

Usage:
    python md_to_html.py [--parts DIR] [--out-md FICHIER] [--out-html FICHIER]
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

try:
    import markdown
except ImportError:  # pragma: no cover
    sys.exit("Le paquet 'markdown' est requis : pip install markdown")

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PARTS = ROOT / ".build-tmp"
DEFAULT_MD = ROOT / "docs" / "Liguita_Plan_Implementation_v3.md"
DEFAULT_HTML = ROOT / "docs" / "Liguita_Plan_Implementation_v3.html"

DOC_TITLE = "Liguita — Plan d'implémentation technique"
DOC_SUBTITLE = "Plateforme tchadienne des objets perdus et retrouvés · Version 3.0"

CSS = """
:root{
  --brand-50:#FDECEE; --brand-100:#FBD5D9; --brand-200:#F4A5AD; --brand-300:#EC6E7A;
  --brand-400:#E53947; --brand-500:#E50F1A; --brand-600:#C70D17; --brand-700:#A30A12;
  --brand-800:#7E070E; --brand-900:#56040A;
  --ink-0:#FFFFFF; --ink-50:#F7F8FA; --ink-100:#EEF1F5; --ink-200:#DEE3EA;
  --ink-300:#B7BEC9; --ink-400:#8A929E; --ink-500:#5B6470; --ink-700:#2A2F38; --ink-900:#0E1116;
  --success:#166534; --success-bg:#DCFCE7; --warning:#92400E; --warning-bg:#FEF3C7;
  --danger:#DC2626; --danger-bg:#FEE2E2; --info:#2563EB;
  --font-display:"Plus Jakarta Sans","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --font-body:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --font-mono:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace;
  --radius-lg:12px; --radius-xl:16px; --radius-full:999px;
  --shadow-100:0 1px 2px rgba(14,17,22,.06),0 1px 1px rgba(14,17,22,.04);
  --shadow-200:0 4px 12px rgba(14,17,22,.08),0 2px 4px rgba(14,17,22,.04);
  --shadow-300:0 12px 32px rgba(14,17,22,.10),0 4px 8px rgba(14,17,22,.05);
}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;scroll-padding-top:24px;}
body{
  margin:0;background:var(--ink-50);color:var(--ink-900);
  font-family:var(--font-body);font-size:16px;line-height:1.6;
  -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;
}
.wrap{display:grid;grid-template-columns:290px minmax(0,1fr);gap:0;max-width:1500px;margin:0 auto;}

/* ---------- Sidebar ---------- */
nav.toc{
  position:sticky;top:0;height:100vh;overflow-y:auto;padding:28px 20px 48px;
  background:var(--ink-0);border-right:1px solid var(--ink-200);
}
nav.toc .brand{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
nav.toc .pin{width:26px;height:26px;flex:0 0 26px;}
nav.toc .brand b{font-family:var(--font-display);font-size:17px;font-weight:800;letter-spacing:-.02em;}
nav.toc .brand b span{color:var(--brand-500);}
nav.toc .ver{font-size:11px;color:var(--ink-500);letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:22px;}
nav.toc ol{list-style:none;margin:0;padding:0;}
nav.toc li{margin:0;}
nav.toc a{
  display:block;padding:5px 10px;border-radius:8px;text-decoration:none;
  color:var(--ink-700);font-size:13px;line-height:1.35;border-left:2px solid transparent;
}
nav.toc a:hover{background:var(--ink-50);color:var(--ink-900);}
nav.toc a.lvl2{font-weight:700;margin-top:8px;}
nav.toc a.lvl3{padding-left:22px;font-size:12.5px;color:var(--ink-500);}
nav.toc a.active{background:var(--brand-50);color:var(--brand-700);border-left-color:var(--brand-500);}
nav.toc .navfoot{margin-top:26px;padding-top:18px;border-top:1px solid var(--ink-200);font-size:11px;color:var(--ink-400);line-height:1.6;}

/* ---------- Content ---------- */
main{padding:44px 56px 96px;min-width:0;}
article{
  background:var(--ink-0);border:1px solid var(--ink-200);border-radius:var(--radius-xl);
  padding:56px 64px;box-shadow:var(--shadow-100);max-width:1000px;
}
h1,h2,h3,h4,h5{font-family:var(--font-display);color:var(--ink-900);}
h1{font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:1.12;margin:0 0 8px;}
h1 + p strong, h1 + p{color:var(--ink-500);}
h2{
  font-size:27px;font-weight:800;letter-spacing:-.01em;line-height:1.2;
  margin:64px 0 18px;padding-top:26px;border-top:2px solid var(--ink-900);
}
h2:first-of-type{margin-top:40px;}
h3{font-size:20px;font-weight:700;letter-spacing:-.005em;margin:40px 0 12px;color:var(--ink-900);}
h4{font-size:16px;font-weight:700;margin:28px 0 10px;color:var(--ink-700);}
h5{font-size:14px;font-weight:700;margin:22px 0 8px;color:var(--ink-500);text-transform:uppercase;letter-spacing:.08em;}
p{margin:0 0 14px;}
a{color:var(--brand-600);text-decoration:none;border-bottom:1px solid rgba(229,15,26,.28);}
a:hover{color:var(--brand-700);border-bottom-color:var(--brand-700);}
strong{font-weight:700;color:var(--ink-900);}
hr{border:0;border-top:1px solid var(--ink-200);margin:44px 0;}
ul,ol{margin:0 0 16px;padding-left:22px;}
li{margin:5px 0;}
li > ul,li > ol{margin:5px 0;}
blockquote{
  margin:20px 0;padding:16px 20px;background:var(--brand-50);
  border-left:4px solid var(--brand-500);border-radius:0 var(--radius-lg) var(--radius-lg) 0;
}
blockquote p:last-child{margin-bottom:0;}
blockquote strong{color:var(--brand-800);}
code{
  font-family:var(--font-mono);font-size:.875em;background:var(--ink-100);
  padding:2px 5px;border-radius:4px;color:var(--ink-700);
}
pre{
  background:var(--ink-900);color:#E8EBF0;border-radius:var(--radius-lg);
  padding:18px 20px;overflow-x:auto;margin:18px 0;font-size:12.5px;line-height:1.55;
  box-shadow:var(--shadow-200);
}
pre code{background:none;padding:0;color:inherit;font-size:inherit;}
table{
  width:100%;border-collapse:collapse;margin:20px 0;font-size:13.5px;
  border:1px solid var(--ink-200);border-radius:var(--radius-lg);overflow:hidden;
}
thead th{
  background:var(--ink-50);text-align:left;font-size:10.5px;font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;color:var(--ink-500);
  padding:11px 14px;border-bottom:1px solid var(--ink-200);white-space:nowrap;
}
tbody td{padding:11px 14px;border-bottom:1px solid var(--ink-200);vertical-align:top;}
tbody tr:last-child td{border-bottom:0;}
tbody tr:hover{background:var(--ink-50);}
td code{font-size:12px;}
.wrap-table{overflow-x:auto;}

/* Mise en evidence des blocs ASCII et des avertissements */
pre code{white-space:pre;}

/* ---------- Print ---------- */
@media print{
  body{background:#fff;font-size:10.5pt;}
  nav.toc{display:none;}
  .wrap{display:block;max-width:none;}
  main{padding:0;}
  article{border:0;box-shadow:none;padding:0;max-width:none;}
  h2{page-break-after:avoid;break-after:avoid;}
  h3,h4{page-break-after:avoid;break-after:avoid;}
  pre,table,blockquote{page-break-inside:avoid;break-inside:avoid;}
  pre{background:#F2F3F5;color:#0E1116;border:1px solid #DEE3EA;font-size:8.5pt;}
  a{color:#0E1116;border:0;}
}

/* ---------- Responsive ---------- */
@media (max-width:1080px){
  .wrap{grid-template-columns:1fr;}
  nav.toc{position:static;height:auto;border-right:0;border-bottom:1px solid var(--ink-200);}
  nav.toc ol{columns:2;column-gap:24px;}
  main{padding:28px 20px 64px;}
  article{padding:32px 22px;}
  h1{font-size:29px;}
  h2{font-size:22px;}
}
"""

FAVICON = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    "%3Cpath d='M16 3c-4.4 0-8 3.6-8 8 0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z' "
    "fill='%23E50F1A'/%3E%3Ccircle cx='16' cy='11' r='3.2' fill='white'/%3E%3C/svg%3E"
)

PIN_SVG = (
    "<svg class='pin' viewBox='0 0 32 32' aria-hidden='true'>"
    "<path d='M16 3c-4.4 0-8 3.6-8 8 0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z' fill='#E50F1A'/>"
    "<circle cx='16' cy='11' r='3.2' fill='white'/></svg>"
)


def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", text).strip("-")[:80] or "section"


def build_toc(body: str) -> tuple[str, list[tuple[int, str, str]]]:
    """Ajoute des id aux h2/h3 et retourne le sommaire."""
    entries: list[tuple[int, str, str]] = []
    counter: dict[str, int] = {}

    def repl(match: re.Match[str]) -> str:
        level = int(match.group(1))
        inner = match.group(2)
        slug = slugify(inner)
        counter[slug] = counter.get(slug, 0) + 1
        if counter[slug] > 1:
            slug = f"{slug}-{counter[slug]}"
        entries.append((level, slug, inner))
        return f'<h{level} id="{slug}">{inner}</h{level}>'

    # L'extension 'toc' de markdown ajoute deja un attribut id : on le remplace
    # par notre propre ancre pour garantir la correspondance avec le sommaire.
    body = re.sub(r'<h([23])(?:\s+id="[^"]*")?\s*>(.*?)</h\1>', repl, body, flags=re.DOTALL)
    return body, entries


def render_toc(entries: list[tuple[int, str, str]]) -> str:
    if not entries:
        return ""
    items = []
    for level, slug, label in entries:
        cls = "lvl2" if level == 2 else "lvl3"
        items.append(f'<li><a class="{cls}" href="#{slug}">{label}</a></li>')
    return "<ol>" + "".join(items) + "</ol>"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parts", type=Path, default=DEFAULT_PARTS)
    parser.add_argument("--out-md", type=Path, default=DEFAULT_MD)
    parser.add_argument("--out-html", type=Path, default=DEFAULT_HTML)
    args = parser.parse_args()

    parts = sorted(
        (p for p in args.parts.glob("p*.md") if re.fullmatch(r"p\d+", p.stem)),
        key=lambda p: int(re.sub(r"\D", "", p.stem)),
    ) if args.parts.is_dir() else []

    if parts:
        md_text = "\n\n".join(p.read_text(encoding="utf-8").strip() for p in parts) + "\n"
        args.out_md.parent.mkdir(parents=True, exist_ok=True)
        args.out_md.write_text(md_text, encoding="utf-8")
        print(f"[ok] Markdown  : {args.out_md}  ({len(md_text):,} caracteres, {len(parts)} parties)")
    elif args.out_md.is_file():
        # Les parties ont ete supprimees : le Markdown est la source de verite.
        md_text = args.out_md.read_text(encoding="utf-8")
        print(f"[--] Markdown  : {args.out_md}  ({len(md_text):,} caracteres, source directe)")
    else:
        sys.exit(f"Ni parties dans {args.parts}, ni Markdown dans {args.out_md}")

    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists", "attr_list", "toc", "md_in_html"],
        output_format="html5",
    )
    body, entries = build_toc(body)
    toc_html = render_toc(entries)

    doc = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(DOC_TITLE)}</title>
<meta name="description" content="{html.escape(DOC_SUBTITLE)}">
<link rel="icon" href="{FAVICON}">
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
  <nav class="toc" aria-label="Sommaire">
    <div class="brand">{PIN_SVG}<b>ligu<span>ita</span></b></div>
    <div class="ver">Plan technique · v3.0</div>
    {toc_html}
    <div class="navfoot">
      Design system canonique · Grille tarifaire v1<br>
      Tchad (TD) · XAF · +235<br>
      23 septembre 2026
    </div>
  </nav>
  <main>
    <article>
{body}
    </article>
  </main>
</div>
<script>
(function () {{
  var links = Array.prototype.slice.call(document.querySelectorAll('nav.toc a'));
  var targets = links.map(function (a) {{ return document.getElementById(a.getAttribute('href').slice(1)); }});
  if (!('IntersectionObserver' in window)) return;
  var obs = new IntersectionObserver(function (entries) {{
    entries.forEach(function (e) {{
      if (!e.isIntersecting) return;
      var i = targets.indexOf(e.target);
      if (i < 0) return;
      links.forEach(function (l) {{ l.classList.remove('active'); }});
      links[i].classList.add('active');
    }});
  }}, {{ rootMargin: '-10% 0px -75% 0px', threshold: 0 }});
  targets.forEach(function (t) {{ if (t) obs.observe(t); }});
}})();
</script>
</body>
</html>
"""
    args.out_html.parent.mkdir(parents=True, exist_ok=True)
    args.out_html.write_text(doc, encoding="utf-8")
    print(f"[ok] HTML      : {args.out_html}  ({len(doc):,} caracteres, {len(entries)} entrees de sommaire)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
