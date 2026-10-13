export const CATEGORIES = [
  { key: 'fashion', label: 'Fashion & Outfits', short: 'Fashion', emoji: '👗' },
  { key: 'selfies', label: 'Selfies & Personal Style', short: 'Selfies', emoji: '🤳' },
  { key: 'photography', label: 'Photography & Creativity', short: 'Photography', emoji: '🎨' }
];

export const categoryLabel = (key) =>
  (CATEGORIES.find((c) => c.key === key) || CATEGORIES[1]).label;
