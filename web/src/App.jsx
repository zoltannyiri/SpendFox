import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Navbar from './components/Navbar'
import SubscriptionList from './screens/SubscriptionScreen/SubscriptionList'
import RegisterScreen from './screens/RegisterScreen/RegisterScreen'
import Footer from './components/Footer'
import LoginScreen from './screens/LoginScreen/LoginScreen'
import HomeScreen from './screens/HomeScreen/HomeScreen'
import ProfileScreen from './screens/ProfileScreen/ProfileScreen'
import ProfileEditScreen from './screens/ProfileScreen/ProfileEditScreen'
import PostDetailScreen from './screens/PostDetailScreen/PostDetailScreen'
import MessageScreen from './screens/MessageScreen/MessageScreen'
import SubscriptionShareScreen from './screens/SubscriptionScreen/SubscriptionShareScreen'
import SubscriptionJoinScreen from './screens/SubscriptionScreen/SubscriptionJoinScreen'
import { useAuth } from './auth/UseAuth'

function App() {
  const accessToken = localStorage.getItem("accessToken");
  const { user } = useAuth();
  if (accessToken) {
    console.log("User token found:", accessToken);
  } else {
    console.log("No user token found.");
  }
  return (
    <Router>
      <Navbar />
      <Routes>
        {user ? (
          <>
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/subscriptions" element={<SubscriptionList />} />
            <Route path="/subscriptions/:id/share" element={<SubscriptionShareScreen />} />
            <Route path="/subscription-share/:token" element={<SubscriptionJoinScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/profile/edit" element={<ProfileEditScreen />} />
            <Route path="/settings" element={<ProfileEditScreen />} />
            <Route path="/messages/:userId" element={<MessageScreen />} />
            <Route path="/post/:activityId" element={<PostDetailScreen />} />
            <Route path="/:username" element={<ProfileScreen />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </>
        ) : (
          <>
            <Route path="/subscription-share/:token" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
      <Footer />
    </Router>
  )
}

export default App
