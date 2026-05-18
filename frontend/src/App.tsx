import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import { CartProvider } from './context/CartContext';

import { WishlistProvider } from './context/WishlistContext';

import { LanguageProvider } from './context/LanguageContext';

import Chatbot from './components/Chatbot';



// Public Pages

import LandingPage from './pages/public/LandingPage';

import LoginPage from './pages/public/LoginPage';

import RegisterPage from './pages/public/RegisterPage';

import VerifyPage from './pages/public/VerifyPage';

import ForgotPasswordPage from './pages/public/ForgotPasswordPage';

import MarketplacePage from './pages/public/MarketplacePage';

import ProductDetailPage from './pages/public/ProductDetailPage';

import CheckoutPage from './pages/public/CheckoutPage';

import WishlistPage from './pages/public/WishlistPage';





// Dashboard Layout

import DashboardLayout from './components/layout/DashboardLayout';



// Dashboard Pages

import DashboardHome from './pages/dashboard/DashboardHome';

import BatchesPage from './pages/dashboard/BatchesPage';

import CreateBatchPage from './pages/dashboard/CreateBatchPage';

import BatchDetailPage from './pages/dashboard/BatchDetailPage';

import AddEventPage from './pages/dashboard/AddEventPage';

import BatchSplitPage from './pages/dashboard/BatchSplitPage';

import TransferPage from './pages/dashboard/TransferPage';

import QRManagementPage from './pages/dashboard/QRManagementPage';

import QRScannerPage from './pages/dashboard/QRScannerPage';

import EventsPage from './pages/dashboard/EventsPage';

import AnalyticsPage from './pages/dashboard/AnalyticsPage';

import ProfilePage from './pages/dashboard/ProfilePage';

import Payment from './components/Payment';

import SmartCropGrowthPage from './pages/dashboard/SmartCropGrowthPage';

import RetailerListProductPage from './pages/dashboard/RetailerListProductPage';



// Admin Pages

import AdminDashboard from './pages/admin/AdminDashboard';

import UsersPage from './pages/admin/UsersPage';

import ActivityPage from './pages/admin/ActivityPage';

import CertificationsPage from './pages/admin/CertificationsPage';



function App() {

  return (

    <LanguageProvider>

      <AuthProvider>

        <CartProvider>

          <WishlistProvider>

            <Router>

            <Routes>

              {/* Public Routes */}

              <Route path="/" element={<LandingPage />} />

              <Route path="/login" element={<LoginPage />} />

              <Route path="/register" element={<RegisterPage />} />

              <Route path="/verify" element={<VerifyPage />} />

              <Route path="/forgot-password" element={<ForgotPasswordPage />} />



              {/* Marketplace Routes (Public) */}

              {/* Consumer E-commerce Routes (Wrapped in DashboardLayout for Header) */}

              <Route element={<DashboardLayout />}>

                <Route path="/marketplace" element={<MarketplacePage />} />

                <Route path="/marketplace/:id" element={<ProductDetailPage />} />

                <Route path="/checkout" element={<CheckoutPage />} />

                <Route path="/wishlist" element={<WishlistPage />} />

              </Route>



              {/* Dashboard Routes */}

              <Route path="/dashboard" element={<DashboardLayout />}>

                <Route index element={<DashboardHome />} />



                {/* Smart Crop Growth */}

                <Route path="crop-growth" element={<SmartCropGrowthPage />} />



                {/* Batch Management */}

                <Route path="batches" element={<BatchesPage />} />

                <Route path="batches/create" element={<CreateBatchPage />} />

                <Route path="batches/:id" element={<BatchDetailPage />} />

                <Route path="batches/:id/add-event" element={<AddEventPage />} />

                <Route path="batches/:id/split" element={<BatchSplitPage />} />

                <Route path="transfer" element={<TransferPage />} />



                {/* QR Code Management */}

                <Route path="qr" element={<QRManagementPage />} />

                <Route path="qr/scan" element={<QRScannerPage />} />



                {/* Retailer */}

                <Route path="list-product" element={<RetailerListProductPage />} />



                {/* Other routes */}

                <Route path="events" element={<EventsPage />} />

                <Route path="analytics" element={<AnalyticsPage />} />

                <Route path="profile" element={<ProfilePage />} />

                <Route path="payment" element={<Payment />} />



                {/* Admin Routes */}

                <Route path="admin" element={<AdminDashboard />} />

                <Route path="admin/users" element={<UsersPage />} />

                <Route path="admin/activity" element={<ActivityPage />} />

                <Route path="admin/certifications" element={<CertificationsPage />} />

              </Route>



              {/* Fallback */}

              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>

            <Chatbot />

            </Router>

          </WishlistProvider>

        </CartProvider>

      </AuthProvider>

    </LanguageProvider>

  );

}



export default App;



