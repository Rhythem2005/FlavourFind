import { Routes, Route } from 'react-router-dom'
import FoodLensAI from './pages/homepage'
import Results from "./pages/Results";


function App() {
  return (
    <Routes>
      <Route path="/" element={<FoodLensAI />} />
      <Route path="/results" element={<Results />} />

    </Routes>
  )
}

export default App
