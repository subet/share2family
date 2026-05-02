export const AVATAR_EMOJIS = [
  '😊', '😎', '🥰', '🤗', '😇', '🤩', '🥳', '😋',
  '🦊', '🐱', '🐶', '🐻', '🐼', '🦁', '🐸', '🐵',
  '🌸', '🌻', '🌺', '🌹', '🍀', '🌿', '🌴', '🌙',
  '⭐', '🔥', '💎', '🎯', '🎨', '🎵', '🚀', '💫',
] as const;

// Ionicon names used as note icons
export const NOTE_ICONS = [
  'cart-outline',
  'list-outline',
  'film-outline',
  'book-outline',
  'home-outline',
  'fitness-outline',
  'flag-outline',
  'airplane-outline',
  'gift-outline',
  'restaurant-outline',
  'brush-outline',
  'medkit-outline',
  'game-controller-outline',
  'leaf-outline',
  'bulb-outline',
  'clipboard-outline',
  'heart-outline',
  'musical-notes-outline',
  'pizza-outline',
  'cafe-outline',
  'barbell-outline',
  'phone-portrait-outline',
  'paw-outline',
  'star-outline',
] as const;

export const DEFAULT_NOTE_ICON = 'clipboard-outline';

export function getRandomEmoji(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}
