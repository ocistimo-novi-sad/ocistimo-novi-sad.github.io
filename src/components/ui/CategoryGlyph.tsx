import { Cone, Ellipsis, SprayCan, Trash, Trees, type LucideIcon } from 'lucide-react';
import { CATEGORY_MAP } from '../../config';
import type { Category } from '../../types';

const ICONS: Record<Category, LucideIcon> = {
  waste: Trash,
  graffiti: SprayCan,
  damaged_infrastructure: Cone,
  neglected_area: Trees,
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
