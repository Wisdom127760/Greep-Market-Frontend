# Greep Market - Retail Management System

A modern, mobile-first retail management system built with React, TypeScript, and Tailwind CSS. Designed for small market owners with minimal technical knowledge, focusing on speed and ease of use.

## Features

### 🏪 Core Features

- **Dashboard** - Overview with key metrics, sales trends, and inventory alerts
- **Product Management** - Add, edit, search products with barcode support
- **Point of Sale (POS)** - Quick transaction interface with cart and payment processing
- **Inventory Tracking** - Stock levels with low stock alerts and reorder suggestions
- **Reports & Analytics** - Sales analytics and inventory reports with interactive charts

### 📱 Design Features

- **Mobile-First Responsive Design** - Optimized for mobile devices with touch-friendly interface
- **Clean, Minimal UI** - Plenty of white space and intuitive navigation
- **Card-Based Layout** - Better organization and visual hierarchy
- **Modern Color Scheme** - Green/blue palette perfect for market theme
- **Touch-Friendly Interactions** - Large buttons and easy-to-use controls

### 🔧 Technical Features

- **Barcode Scanner Integration** - Camera API for quick product identification
- **Real-Time Updates** - Context API for state management
- **Interactive Charts** - Recharts for beautiful data visualization
- **Toast Notifications** - User feedback for all actions
- **TypeScript** - Type safety and better development experience

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management
- **Recharts** for analytics and charts
- **html5-qrcode** for barcode scanning
- **react-hot-toast** for notifications
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd FRONTEND_MARKET
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ShoppingCart.tsx
│   │   └── BarcodeScanner.tsx
│   └── navigation/         # Navigation components
│       ├── Header.tsx
│       └── MobileNavigation.tsx
├── context/
│   └── AppContext.tsx      # Global state management
├── pages/                  # Main application pages
│   ├── Dashboard.tsx
│   ├── Products.tsx
│   ├── POS.tsx
│   ├── Inventory.tsx
│   └── Reports.tsx
├── types/
│   └── index.ts           # TypeScript type definitions
├── App.tsx                # Main app component
├── index.tsx              # App entry point
└── index.css              # Global styles
```

## Key Pages

### 1. Dashboard

- Key metrics overview (total sales, products, low stock items)
- Sales trend charts
- Top performing products
- Recent sales activity
- Inventory alerts

### 2. Products

- Product catalog with search and filtering
- Add/edit/delete products
- Barcode scanning for quick product lookup
- Category-based organization
- Stock level indicators

### 3. Point of Sale (POS)

- Quick product search and barcode scanning
- Shopping cart with quantity management
- Multiple payment methods (Cash, POS, Transfer)
- Customer ID tracking
- Discount application

### 4. Inventory

- Stock level monitoring
- Low stock and out-of-stock alerts
- Restock functionality
- Inventory status overview
- Category-based filtering

### 5. Reports

- Sales analytics with interactive charts
- Payment method breakdown
- Product performance analysis
- Inventory status reports
- Export functionality

## UI Components

### Reusable Components

- **Button** - Primary, secondary, danger, and outline variants
- **Card** - Consistent card layout with hover effects
- **Input** - Form inputs with validation and error states
- **Modal** - Responsive modal dialogs
- **SearchBar** - Search with barcode scan integration
- **ProductCard** - Product display with stock alerts
- **ShoppingCart** - Cart management with quantity controls
- **BarcodeScanner** - Camera-based barcode scanning

### Navigation

- **Header** - Top navigation with notifications
- **MobileNavigation** - Bottom navigation for mobile devices

## State Management

The application uses React Context API for state management with the following structure:

- **Products** - Product catalog and inventory
- **Sales** - Transaction history
- **Inventory Alerts** - Low stock and out-of-stock notifications
- **Dashboard Metrics** - Key performance indicators

## Barcode Scanning

The app includes barcode scanning functionality using the device camera:

- Supports multiple barcode formats (EAN-13, EAN-8, CODE-128, etc.)
- Quick product lookup in POS and Products pages
- Error handling for unsupported devices

## Responsive Design

- **Mobile-First** - Optimized for mobile devices
- **Touch-Friendly** - Large buttons and touch targets
- **Adaptive Layout** - Responsive grid system
- **Bottom Navigation** - Easy thumb navigation on mobile

## Currency Support

The application uses Turkish Lira (₺) as the default currency, with proper formatting throughout the interface.

## Future Enhancements

- User authentication and role management
- Offline support with data synchronization
- Advanced reporting with custom date ranges
- Multi-location support
- Integration with external payment systems
- Inventory forecasting and automated reordering
- Customer management and loyalty programs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
# Greep-Market-Frontend
