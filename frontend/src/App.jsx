import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/shared/ProtectedRoute"

import Login from "./pages/Login"
import AdminPermissions from "./pages/AdminPermissions"
import PhotoOrders from "./pages/PhotoOrders"
import Configuration from "./pages/Configuration"
import BillPayment from "./pages/BillPayment"
import MoneyTransfer from "./pages/MoneyTransfer"
import ServiceOrders from "./pages/ServiceOrders"
import TrainBookings from "./pages/TrainBookings"

import Customers from "./pages/Customers"
import Uploads from "./pages/Uploads"
import Transactions from "./pages/Transactions"
import LabPhotoProcess from "./pages/LabPhotoProcess"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Logout from "./pages/Logout"
import { EmailProvider } from "./contexts/EmailContext"
import { EmailQueueWidget } from "./components/shared/EmailQueueWidget"

function App() {
  return (
    <AuthProvider>
      <EmailProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/photo-orders" replace />} />
              <Route path="photo-orders" element={<ProtectedRoute path="/photo-orders"><PhotoOrders /></ProtectedRoute>} />
              <Route path="bill-payment" element={<ProtectedRoute path="/bill-payment"><BillPayment /></ProtectedRoute>} />
              <Route path="money-transfer" element={<ProtectedRoute path="/money-transfer"><MoneyTransfer /></ProtectedRoute>} />
              <Route path="service-orders" element={<ProtectedRoute path="/service-orders"><ServiceOrders /></ProtectedRoute>} />
              <Route path="travel/train" element={<ProtectedRoute path="/travel/train"><TrainBookings /></ProtectedRoute>} />
              <Route path="lab-photo-process" element={<ProtectedRoute path="/lab-photo-process"><LabPhotoProcess /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute path="/customers"><Customers /></ProtectedRoute>} />
              <Route path="uploads" element={<ProtectedRoute path="/uploads"><Uploads /></ProtectedRoute>} />
              <Route path="configuration" element={<ProtectedRoute path="/configuration"><Configuration /></ProtectedRoute>} />
              <Route path="transactions" element={<ProtectedRoute path="/transactions"><Transactions /></ProtectedRoute>} />
              <Route path="admin/permissions" element={<AdminPermissions />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <EmailQueueWidget />
      </EmailProvider>
    </AuthProvider>
  )
}

export default App
