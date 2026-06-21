// Storage manager for FoodLens AI V2
// Uses localStorage to log search history, bookmarks, and calculate real user statistics.

const KEYS = {
  HISTORY: "foodlens_history",
  SAVED_RESTAURANTS: "foodlens_saved",
  RECENTLY_VIEWED: "foodlens_recently_viewed",
};

// Safe wrapper for JSON.parse
const getJson = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
};

// Safe wrapper for JSON.stringify
const setJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
};

/**
 * Log a search query and its metrics in the history
 */
export const saveSearchToHistory = (query, results = []) => {
  if (!query || !query.trim()) return;

  const history = getJson(KEYS.HISTORY);

  // Avoid duplicate adjacent searches
  const lastEntry = history[0];
  if (lastEntry && lastEntry.query.toLowerCase() === query.trim().toLowerCase()) {
    // Just update the timestamp and results count
    lastEntry.timestamp = Date.now();
    lastEntry.resultsCount = results.length;
    setJson(KEYS.HISTORY, history);
    return;
  }

  // Calculate metrics
  const prices = results.map(r => r.price).filter(p => p != null && p > 0);
  const ratings = results.map(r => r.rating).filter(r => r != null && r > 0);
  
  const cheapestPrice = prices.length ? Math.min(...prices) : null;
  const averagePrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  const highestRating = ratings.length ? Math.max(...ratings) : null;
  const bestOverallRestaurant = results[0]?.restaurant || null;

  const newEntry = {
    id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    query: query.trim(),
    timestamp: Date.now(),
    resultsCount: results.length,
    cheapestPrice,
    averagePrice,
    highestRating,
    bestOverallRestaurant,
  };

  // Keep history to a reasonable limit (e.g. 50 entries)
  const updatedHistory = [newEntry, ...history].slice(0, 50);
  setJson(KEYS.HISTORY, updatedHistory);
};

/**
 * Get search history
 */
export const getSearchHistory = () => {
  return getJson(KEYS.HISTORY);
};

/**
 * Clear search history
 */
export const clearSearchHistory = () => {
  setJson(KEYS.HISTORY, []);
};

/**
 * Toggle saving a restaurant
 */
export const toggleSavedRestaurant = (restaurant) => {
  if (!restaurant || !restaurant.restaurant) return false;
  
  const saved = getJson(KEYS.SAVED_RESTAURANTS);
  const index = saved.findIndex(r => r.restaurant.toLowerCase() === restaurant.restaurant.toLowerCase());
  
  let isSavedNow = false;
  if (index >= 0) {
    saved.splice(index, 1);
  } else {
    saved.push({
      ...restaurant,
      savedAt: Date.now(),
    });
    isSavedNow = true;
  }
  
  setJson(KEYS.SAVED_RESTAURANTS, saved);
  // Dispatch a custom event to notify components (like Nav bar badges) of storage updates
  window.dispatchEvent(new Event("foodlens_saved_changed"));
  return isSavedNow;
};

/**
 * Check if a restaurant is bookmarked
 */
export const isRestaurantSaved = (restaurantName) => {
  if (!restaurantName) return false;
  const saved = getJson(KEYS.SAVED_RESTAURANTS);
  return saved.some(r => r.restaurant.toLowerCase() === restaurantName.toLowerCase());
};

/**
 * Get all bookmarked restaurants
 */
export const getSavedRestaurants = () => {
  return getJson(KEYS.SAVED_RESTAURANTS);
};

/**
 * Log a restaurant click to recently viewed
 */
export const addToRecentlyViewed = (restaurant) => {
  if (!restaurant || !restaurant.restaurant) return;
  
  const recent = getJson(KEYS.RECENTLY_VIEWED);
  const filtered = recent.filter(r => r.restaurant.toLowerCase() !== restaurant.restaurant.toLowerCase());
  
  const updated = [
    { ...restaurant, viewedAt: Date.now() },
    ...filtered
  ].slice(0, 10); // keep last 10
  
  setJson(KEYS.RECENTLY_VIEWED, updated);
};

/**
 * Get recently viewed restaurants
 */
export const getRecentlyViewed = () => {
  return getJson(KEYS.RECENTLY_VIEWED);
};

/**
 * Calculate user stats based on their search history and saved items.
 * Provides real, non-arbitrary analytics.
 */
export const calculateStats = () => {
  const history = getSearchHistory();
  const saved = getSavedRestaurants();
  
  // Calculate average savings
  // Savings for a query = Average Price - Cheapest Price
  let totalSavings = 0;
  let savingsCount = 0;
  
  history.forEach(entry => {
    if (entry.averagePrice && entry.cheapestPrice && entry.averagePrice > entry.cheapestPrice) {
      totalSavings += (entry.averagePrice - entry.cheapestPrice);
      savingsCount++;
    }
  });
  
  const avgSavings = savingsCount > 0 ? Math.round(totalSavings / savingsCount) : 0;
  
  // Aggregate unique restaurants seen in history
  const uniqueRestaurants = new Set();
  history.forEach(entry => {
    if (entry.bestOverallRestaurant) {
      uniqueRestaurants.add(entry.bestOverallRestaurant);
    }
  });
  
  return {
    totalSearches: history.length,
    savedCount: saved.length,
    averageSavingsPerSearch: avgSavings,
    restaurantsDiscovered: uniqueRestaurants.size + saved.length,
  };
};
