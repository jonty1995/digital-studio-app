import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"

import PhotoOrders from "./pages/PhotoOrders"
import Configuration from "./pages/Configuration"
import BillPayment from "./pages/BillPayment"
import MoneyTransfer from "./pages/MoneyTransfer"
import ServiceOrders from "./pages/ServiceOrders"
import SystemLogs from "./pages/SystemLogs"

import Customers from "./pages/Customers"
import Uploads from "./pages/Uploads"
import LabPhotoProcess from "./pages/LabPhotoProcess"
import { EmailProvider } from "./contexts/EmailContext"
import { EmailQueueWidget } from "./components/shared/EmailQueueWidget"

function App() {
  return (
    <EmailProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/photo-orders" replace />} />
            <Route path="photo-orders" element={<PhotoOrders />} />
            <Route path="bill-payment" element={<BillPayment />} />
            <Route path="money-transfer" element={<MoneyTransfer />} />
            <Route path="service-orders" element={<ServiceOrders />} />
            <Route path="lab-photo-process" element={<LabPhotoProcess />} />
            <Route path="customers" element={<Customers />} />
            <Route path="uploads" element={<Uploads />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="configuration" element={<Configuration />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <EmailQueueWidget />
    </EmailProvider>
  )
}

export default App
