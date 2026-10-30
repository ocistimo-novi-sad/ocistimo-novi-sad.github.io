import { Cone, Ellipsis, Flag, SprayCan, Sticker, Trash, type LucideIcon } from 'lucide-react';
import { CATEGORY_MAP } from '../../config';
import type { Category } from '../../types';

const ICONS: Record<Category, LucideIcon> = {
  unwanted_graffiti: SprayCan,
  fan_graffiti: Flag,
  stickers_posters: Sticker,
  illegal_dump: Trash,
  damaged_infrastructure: Cone,
  other: Ellipsis,
};

export function CategoryGlyph({
  category,
  size = 14,
  className,
}: {
  category: Category;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category];
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden="true" />;
}

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="category-tag" data-category={category}>
      <CategoryGlyph category={category} size={12} />
      {CATEGORY_MAP[category].label}
    </span>
  );
}
