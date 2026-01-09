import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"

import PhotoOrders from "./pages/PhotoOrders"
import Configuration from "./pages/Configuration"
import BillPayment from "./pages/BillPayment"
import SystemLogs from "./pages/SystemLogs"

import Customers from "./pages/Customers"
import Uploads from "./pages/Uploads"

<Route path="bill-payment" element={<BillPayment />} />

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/photo-orders" replace />} />
          <Route path="photo-orders" element={<PhotoOrders />} />
          <Route path="bill-payment" element={<BillPayment />} />
          <Route path="customers" element={<Customers />} />
          <Route path="uploads" element={<Uploads />} />
          <Route path="logs" element={<SystemLogs />} />
          <Route path="configuration" element={<Configuration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
