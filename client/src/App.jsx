import { Routes, Route } from 'react-router-dom'
import FoodLensAI from './pages/homepage'
import Results from "./pages/Results"
import Comparison from "./pages/Comparison"
import SavedRestaurants from "./pages/SavedRestaurants"
import SearchHistory from "./pages/SearchHistory"
import FoodInsights from "./pages/FoodInsights"
import RestaurantDetail from "./pages/RestaurantDetail"

function App() {
  return (
    <Routes>
      <Route path="/" element={<FoodLensAI />} />
      <Route path="/results" element={<Results />} />
      <Route path="/compare" element={<Comparison />} />
      <Route path="/saved" element={<SavedRestaurants />} />
      <Route path="/history" element={<SearchHistory />} />
      <Route path="/insights" element={<FoodInsights />} />
      <Route path="/restaurant/:name" element={<RestaurantDetail />} />
    </Routes>
  )
}

export default App

