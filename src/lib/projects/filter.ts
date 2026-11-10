/**
 * Build-time and client-safe helpers for the Projects category filter (PROJ-04). Node-safe: no
 * Astro virtual modules and no dictionaries; labels come from the cards' already localized category.
 */
import { categoryIds, type CategoryId } from './model';
import { tileSize, type TileSize } from './layout';

/** The part of a project card the chip row needs. */
export interface CategorizedCard {
  categoryId: CategoryId | null;
  category: string | null;
}

export interface CategoryChip {
  id: CategoryId;
  label: string;
  count: number;
}

/**
 * One chip per category that has at least one card, in services.json order (`categoryIds`, D-13).
 * Empty categories get no chip (D-12) and uncategorised cards only count towards All. With fewer
 * than two chips the filter is pointless, so no chip row renders at all (UI-SPEC).
 */
export function buildCategoryChips(cards: readonly CategorizedCard[]): CategoryChip[] {
  const chips: CategoryChip[] = [];
  for (const id of categoryIds) {
    const matching = cards.filter((card) => card.categoryId === id);
    const [first] = matching;
    if (first === undefined) continue;
    if (first.category === null) throw new Error(`projects: category ${id} has no title`);
    chips.push({ id, label: first.category, count: matching.length });
  }
  return chips.length < 2 ? [] : chips;
}

/** Tile sizes for `count` visible cards: the D-18 rhythm restarts on the filtered set. */
export function visibleTiles(count: number): TileSize[] {
  return Array.from({ length: count }, (_, index) => tileSize(index, count));
}
