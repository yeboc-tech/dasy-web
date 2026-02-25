interface BoardColorTagProps {
  tag: string;
  size?: 'sm' | 'md';
}

function tagToColor(tag: string): { bg: string; text: string; border: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = ((hash % 360) + 360) % 360;
  const saturation = 55 + (Math.abs(hash >> 8) % 20);
  const lightness = 92;

  const bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const text = `hsl(${hue}, ${saturation}%, 35%)`;
  const border = `hsl(${hue}, ${saturation}%, 78%)`;

  return { bg, text, border };
}

export function BoardColorTag({ tag, size = 'sm' }: BoardColorTagProps) {
  const colors = tagToColor(tag);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded font-medium border ${sizeClasses}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {tag}
    </span>
  );
}
