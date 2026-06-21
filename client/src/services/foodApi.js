// API Service for FoodLens AI
// This module handles all HTTP requests to the FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Search for food across all platforms
 * @param {string} query - The search query (e.g., "biryani under ₹300")
 * @returns {Promise<Object>} - Response containing search results and recommendations
 */
export const searchFood = async (query) => {
  if (!query || !query.trim()) {
    throw new Error("Search query cannot be empty");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Search API error:", error);
    throw error;
  }
};

export default {
  searchFood,
};
