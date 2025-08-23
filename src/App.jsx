import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import Homepage from "./pages/HomePage/HomePage";

import Signup from "./pages/Signup/signup";
import RecipientDashboard from "./pages/RecipientDashboard/RecipientDashboard";
import DonorDashboard from "./pages/DonorDashboard/DonationForm";
import VolunteerDashboard from "./pages/VolunteerDashboard/VolunteerDashboard";
import Login from "./pages/login";
import Redirect from "./pages/Redirect";
import UserPage from "./pages/UserPage/Userpage";
import AnalyticsPage from "./pages/UserPage/Analytics";
import ProtectedRoute from "./components/ProtectedRoute";
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/redirect" element={<Redirect/>} />
          <Route element={<ProtectedRoute />}>
        {/* Only authenticated users can access below routes */}
          <Route path="/recipient" element={<RecipientDashboard />} />
          <Route path="/donor" element={<UserPage />} />
          <Route path="/DonationForm" element={<DonorDashboard />} />
          <Route path="/volunteer" element={<VolunteerDashboard />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;
