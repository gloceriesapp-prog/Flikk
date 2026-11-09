"""Turn the supermarket catalogue sheet into SQL for the master item list.

Usage (needs openpyxl):
  python backend/scripts/catalogue-import.py "SUPER MARKET ITEMS_v1.xlsx" products.json out_dir/

Reads the sheet's Main Section / Category Tile / Sidebar Subcategory / App
Display Name columns (MRP, prices and sizes are ignored) and writes:
  01_subcategories.sql  sidebar sub-categories under the existing tiles
                        (+ any missing tile), skipped when they already exist
  02_items_NN.sql       catalogue_items in batches; re-running never duplicates
                        (unique name per sub-category)
  03_products.sql       files each existing product (products.json: id, name,
                        sub_category_id, category name) under its sheet
                        sub-category, links it to its item, removes empty
                        "General" sub-categories
  review.txt            how each existing product was placed, for checking

Sheet section/tile names that differ from the database are mapped below to
the existing names. Rows with no section/tile/sub-category become items with
no sub-category ("needs category").
"""
import difflib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl

SECTION_ALIASES = {
    'Beauty & Personal Care': 'Personal Care',
    'Bags & Accessories': 'Bags & Footwear',
}
TILE_ALIASES = {
    'Bags & Backpacks': 'Bags',
    'Footwear': 'Shoes & Slippers',
    'Milk & Milk Drinks': 'Milk & Dairy Drinks',
    'Pickles & Sauces': 'Pickles, Pastes & Sauces',
    'Batteries & Electricals': 'Batteries & Electrical',
    'Bottles & Flasks': 'Bottles & Drinkware',
    'Home Utilities': 'Pumps & Utilities',
    'Pooja Items': 'Other Pooja Items',
    'Pooja Oils & Ghee': 'Pooja Oils',
    'School Essentials': 'School Supplies',
    'Gifts & Party Supplies': 'Gifts',
}
BATCH = 1500
# Hand-checked placements for existing products the matcher gets wrong (or
# where the sheet itself files the item oddly). Product name -> (tile, sub).
PRODUCT_OVERRIDES = {
    '7UP Soft Drink, 330 ml': ('Drinks, Juices & Water', 'Soft Drinks'),
    'Comfort Fabric ConditIoner After Wash (GREEN)': ('Laundry', 'Liquid Detergents & Pods'),
    'Comfort Fabric Conditioner Morning Fresh Blue, 2 Ltr Pouch': ('Laundry', 'Liquid Detergents & Pods'),
    'Comfort Fabric Conditioner Pink 210ML': ('Laundry', 'Liquid Detergents & Pods'),
    'Comfort Royale Fabric Conditioner': ('Laundry', 'Liquid Detergents & Pods'),
    'Eno Asli Jeera Sachet': ('Personal Health', 'Other Personal Health'),
    'Hellmann’s Cheezy Jalapeño Burst Veg Mayonnaise': ('Pickles, Pastes & Sauces', 'Mayonnaise & Dips'),
    'Dabur Honey Brand with No Sugar Adulteration, 500 gm': ('Pickles, Pastes & Sauces', 'Cooking Pastes & Spreads'),
    'Amul Happy Treats Poppon Cheese Nuggets': ('Frozen Snacks', 'Frozen Veg Snacks'),
    'Amul Tru Milk Nutrition Chocolate': ('Milk & Dairy Drinks', 'Flavoured Milk & Milkshakes'),
    'Bisk Farm Just Ginger, 150 g Pouch': ('Biscuits & Bakery', 'Biscuits & Cookies'),
    'Kohinoor Rozana': ('Rice, Atta & Dal', 'Rice & Grains'),
}


def clean(value) -> str:
    return ' '.join(str(value).split()) if value is not None else ''


def sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def match_key(name: str) -> str:
    """Name without sizes, punctuation or case, for matching products to items."""
    name = re.sub(r'\b\d+(\.\d+)?\s*(g|gm|gms|kg|ml|l|ltr|pack|pcs?)\b', '', name.lower())
    return re.sub(r'[^a-z0-9]', '', name)


def main(sheet_path: str, products_path: str, out_dir: str) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rows = list(openpyxl.load_workbook(sheet_path, read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True))[1:]

    filed = {}        # (tile, sub, lower name) -> (section, tile, sub, name): one per name per sub-category
    unfiled = {}      # lower name -> name
    for row in rows:
        section, tile, sub, name = (clean(row[i]) for i in (4, 5, 6, 7))
        if not name:
            continue
        if section and tile and sub:
            section = SECTION_ALIASES.get(section, section)
            tile = TILE_ALIASES.get(tile, tile)
            filed.setdefault((tile, sub, name.lower()), (section, tile, sub, name))
        else:
            unfiled.setdefault(name.lower(), name)
    # A name that is filed somewhere is not also "needs category".
    filed_names = {key[2] for key in filed}
    unfiled = {k: v for k, v in unfiled.items() if k not in filed_names}

    subs = sorted({(s, t, sb) for (s, t, sb, _) in filed.values()})
    tiles = sorted({(s, t) for (s, t, _) in subs})

    # 01: missing tiles (under their section), then sub-categories.
    lines = ['BEGIN;']
    for section, tile in tiles:
        lines.append(
            f"INSERT INTO public.categories (name, section_id, sort_order) "
            f"SELECT {sql(tile)}, s.id, 999 FROM public.category_sections s WHERE s.name = {sql(section)} "
            f"AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.name = {sql(tile)});")
    values = ',\n'.join(f'({sql(t)}, {sql(sb)})' for (_, t, sb) in subs)
    lines.append(
        "INSERT INTO public.sub_categories (category_id, name)\n"
        f"SELECT c.id, v.sub FROM (VALUES\n{values}\n) AS v(tile, sub) JOIN public.categories c ON c.name = v.tile\n"
        "ON CONFLICT (category_id, name) DO NOTHING;")
    lines.append('COMMIT;')
    (out / '01_subcategories.sql').write_text('\n'.join(lines) + '\n')

    # 02: items in batches (filed ones resolve their sub-category by tile + name).
    items = [(t, sb, n) for (_, t, sb, n) in filed.values()] + [(None, None, n) for n in unfiled.values()]
    for i in range(0, len(items), BATCH):
        chunk = items[i:i + BATCH]
        values = ',\n'.join(f"({sql(t) if t else 'NULL'}, {sql(sb) if sb else 'NULL'}, {sql(n)})" for (t, sb, n) in chunk)
        (out / f'02_items_{i // BATCH + 1:02d}.sql').write_text(
            "INSERT INTO public.catalogue_items (name, sub_category_id)\n"
            f"SELECT v.name, sc.id FROM (VALUES\n{values}\n) AS v(tile, sub, name)\n"
            "LEFT JOIN public.categories c ON c.name = v.tile\n"
            "LEFT JOIN public.sub_categories sc ON sc.category_id = c.id AND sc.name = v.sub\n"
            "ON CONFLICT DO NOTHING;\n")

    # 03: file existing products. Exact name match (sizes ignored) wins; else
    # the closest sheet item within the product's current tile; else the
    # sub-category whose items share the most words with the product name.
    products = json.loads(Path(products_path).read_text())
    by_key = defaultdict(list)
    by_tile = defaultdict(list)
    for (s, t, sb, n) in filed.values():
        by_key[match_key(n)].append((t, sb, n))
        by_tile[t].append((sb, n))
    review, updates = [], []
    for p in products:
        tile = p['category']
        key = match_key(p['name'])
        hit = next((h for h in by_key.get(key, []) if h[0] == tile), None) or (by_key[key][0] if by_key.get(key) else None)
        how = 'exact'
        if p['name'] in PRODUCT_OVERRIDES:
            hit, how = (*PRODUCT_OVERRIDES[p['name']], None), 'manual'
        if not hit and by_tile.get(tile):
            names = [n for _, n in by_tile[tile]]
            close = difflib.get_close_matches(p['name'], names, n=1, cutoff=0.6)
            if close:
                sb = next(sb for sb, n in by_tile[tile] if n == close[0])
                hit, how = (tile, sb, close[0]), 'close'
            else:
                words = set(re.findall(r'[a-z]{3,}', p['name'].lower()))
                score = defaultdict(int)
                for sb, n in by_tile[tile]:
                    score[sb] += len(words & set(re.findall(r'[a-z]{3,}', n.lower())))
                sb = max(score, key=lambda k: (score[k], -len(k)))
                hit, how = (tile, sb, None), 'guess'
        if not hit:
            review.append(f"KEEP    {p['name']}  ->  stays in {tile} (no sheet sub-categories for this tile)")
            continue
        t, sb, item = hit
        # Only an exact match is the same item; a close match or guess only
        # files the product under the sub-category.
        if how != 'exact':
            item = None
        review.append(f"{how.upper():7} {p['name']}  ->  {t} › {sb}" + (f"   (item: {item})" if item else ''))
        link = (f", catalogue_item_id = (SELECT ci.id FROM public.catalogue_items ci WHERE ci.sub_category_id = sc.id "
                f"AND lower(btrim(ci.name)) = lower({sql(item)}) LIMIT 1)") if item else ''
        updates.append(
            f"UPDATE public.products p SET sub_category_id = sc.id{link} FROM public.sub_categories sc "
            f"JOIN public.categories c ON c.id = sc.category_id WHERE p.id = {sql(p['id'])} AND c.name = {sql(t)} AND sc.name = {sql(sb)};")
    updates.append(
        "DELETE FROM public.sub_categories sc WHERE sc.name = 'General' "
        "AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.sub_category_id = sc.id);")
    (out / '03_products.sql').write_text('BEGIN;\n' + '\n'.join(updates) + '\nCOMMIT;\n')
    (out / 'review.txt').write_text('\n'.join(sorted(review)) + '\n')

    print(f'sub-categories {len(subs)} under {len(tiles)} tiles; items {len(items)} '
          f'({len(items) - len(unfiled)} filed, {len(unfiled)} needs category); '
          f'products placed {len(updates) - 1}/{len(products)}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
