import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"

import PhotoOrders from "./pages/PhotoOrders"
import Configuration from "./pages/Configuration"

// Placeholders
const BillPayment = () => <div className="p-4"><h1 className="text-2xl font-bold">Bill Payment</h1></div>
const Customers = () => <div className="p-4"><h1 className="text-2xl font-bold">Customers</h1></div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/photo-orders" replace />} />
          <Route path="photo-orders" element={<PhotoOrders />} />
          <Route path="bill-payment" element={<BillPayment />} />
          <Route path="customers" element={<Customers />} />
          <Route path="configuration" element={<Configuration />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
