# Digital Studio Photo Management Application

A comprehensive full-stack application for managing digital studio operations, including photo orders, customer tracking, bill payments, and service requests.

## 🚀 Technologies

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 4
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Routing**: React Router 7
- **State/Data**: React Hooks, Custom Services

### Backend
- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Build Tool**: Maven
- **Database**: MySQL
- **Utilities**: Lombok

## ✨ Key Features

### 📸 Photo Management
- **Photo Orders**: Track and manage photo printing orders.
- **Uploads**: Manage uploaded files from various sources.
- **Search Priority**: Global search functionality that intelligently overrides filters for quick access to records.

### 💰 Financial Services
- **Bill Payments**: Support for Electricity, Mobile Postpaid, and DTH payments.
- **Mobile Recharge**: Dedicated interface for prepaid mobile recharges.
- **Money Transfer**: Handle UPI and Bank Account transfers.

### 👥 Customer Management
- **Customer Directory**: Centralized database of all customers.
- **Order History**: View complete interaction history for each customer.

### 🛠️ Service Orders
- **Service Tracking**: Manage miscellaneous service requests and orders.

## 📂 Project Structure

```
/
├── backend/            # Spring Boot Application
├── frontend/           # React Application
├── logs/               # Application Logs
├── .gitignore          # Git exclusion rules
└── README.md           # Project Documentation
```

### Docker Deployment (Recommended for Raspberry Pi & Windows)

The application provides a multi-architecture Docker setup (Linux/amd64 and Linux/arm64) that containerizes the MySQL database, Spring Boot backend, and React frontend.

1. Ensure Docker and Docker Compose are installed on your system.
2. Navigate to the project root directory.
3. Use the provided deployment scripts:
   - **Windows:** Run `deploy.bat`
   - **Linux / Raspberry Pi:** Run `./deploy.sh`
4. Alternatively, run the standard compose command:
   ```bash
   docker compose up -d --build
   ```
5. The frontend will be available at `http://localhost` (Port 80) and will automatically proxy API requests to the internal backend container.

### Manual Setup (Development)

#### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure your MySQL database settings in `application.properties`.
3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

#### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Recent Updates
- **Enhanced Search**: Search queries now prioritize over date ranges and specific filters across all listing pages.
- **Git Hygiene**: Optimized `.gitignore` to exclude build artifacts and environment secrets.
- **Performance**: Optimized list rendering with configurable scroll block sizes.

## 🔄 Workflows

### 📸 Photo Orders
1.  **Selection**: Search for an existing customer or create a new one.
2.  **Order Setup**: Select Photo Items (e.g., 4x6, 8x12, PASSPORT), configure quantities, and set urgency (Normal/Urgent).
3.  **Upload**: Attach images or files specific to the order.
4.  **Processing**: The system calculates the total price based on configured rates.
5.  **Tracking**: Monitor the order status from "Pending" to "Printed" to "Delivered".

### 💵 Bill Payments & Recharge
1.  **Service Selection**: Choose between **Electricity**, **Mobile** (Postpaid/Prepaid), or **DTH**.
2.  **Details**: Enter the Consumer Number or Mobile Number and select the Service Provider.
3.  **Payment**: Input the bill/recharge amount and select a Payment Mode (Cash, UPI, GPay, etc.).
4.  **Receipt**: The transaction is saved. You can upload a receipt image if needed.

### 💸 Money Transfer
1.  **Customer**: Select the customer sender.
2.  **Beneficiary**: Enter Bank Account details (Account No, IFSC) or UPI ID.
3.  **Transfer**: Input the transfer amount.
4.  **Record**: Save the transaction with its status (Success/Pending).

### 📂 Uploads Management
1.  **Ingest**: Upload raw files from various sources (WhatsApp, Email) via the "Upload" button.
2.  **Link**: Link unassigned uploads to specific customers for future reference.
3.  **Manage**: View, download, or delete files. Use "Scan Files" to sync the database with the physical disk storage.

### 👥 Customer Directory
1.  **Search**: Quickly find any customer by Name or Mobile Number.
2.  **History**: View a unified timeline of all their Photo Orders, Bill Payments, and Transfers.
3.  **Edit**: Update customer contact details or profile photos.

### 🛠️ Service Orders
1.  **Misc Services**: Track non-photo jobs like Lamination, Xerox, or Graphic Design.
2.  **Workflow**: Similar to Photo Orders but focused on service types defined in Configuration.

### ⚙️ Configuration
1.  **Pricing**: Define base rates for Photo Items and Services.
2.  **Addons**: Configure extra deliverables (Frames, Lamination) and their pricing logic.
3.  **System**: Configure storage paths, scroll block sizes for performance, and view system audit logs.


