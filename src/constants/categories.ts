export const DEFAULT_CATEGORIES = [
  { name: 'Shopping', icon: 'cart-outline', color: '#D97757', position: 0 },
  { name: 'Movies & Books', icon: 'film-outline', color: '#7B68EE', position: 1 },
  { name: 'Home', icon: 'home-outline', color: '#28A745', position: 2 },
  { name: 'Personal', icon: 'heart-outline', color: '#E91E8C', position: 3 },
] as const;

// Map Ionicon names for categories stored as emoji in DB
export const CATEGORY_ICON_MAP: Record<string, string> = {
  '🛒': 'cart-outline',
  '🎬': 'film-outline',
  '🏠': 'home-outline',
  '💜': 'heart-outline',
  // Fallbacks
  '📋': 'list-outline',
  '📝': 'create-outline',
};
