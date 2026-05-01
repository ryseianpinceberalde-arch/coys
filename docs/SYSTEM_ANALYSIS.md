# System Analysis

Analysis basis:
- This document is based on the scanned source code and folder structure in this workspace.
- No reference `.docx` file was found in the repository during the scan, so the comparison section uses only the manuscript summary provided in the prompt.
- Several folders in this workspace are backups, build outputs, or duplicate app copies. They are noted where relevant but are not treated as the main production code unless the source files show active integration.

## 1. Project Overview

- Detected system name: `Coy's Corner` / `mern_pos` / `coys-reserve` naming appears across the codebase.
- Detected project purpose: a retail or food-service management system with POS, inventory, order tracking, reports, settings, and customer/mobile ordering.
- Short explanation: this is not an online student management system based on the scanned code. The main implemented flows are product management, sales processing, stock tracking, user roles, mobile order checkout, and reporting.

## 2. Tech Stack

- Languages:
  - JavaScript across backend, web frontend, and mobile app
  - TypeScript appears in Expo Router entry files such as `app/index.tsx` and `app/_layout.tsx`
  - Batch scripting in `start.bat`
- Frontend framework/libraries:
  - Web: React 18, Vite, React Router, Axios
  - Mobile: Expo, React Native, Expo Router, React Navigation, AsyncStorage
- Backend framework/libraries:
  - Node.js, Express, Mongoose
  - JWT authentication with `jsonwebtoken`
  - Password hashing with `bcryptjs`
  - Validation with `express-validator`
  - File uploads with `multer`
  - Real-time updates with `ws`
- Database:
  - MongoDB via Mongoose
  - Active backend connection points to database name `mern_pos`
- Other important tools/services:
  - `morgan` for HTTP logging
  - Static file serving for uploaded images
  - WebSocket order updates
  - Cloudflare Pages style function proxies in `frontend/functions/` using `onRequest`

## 3. Folder Structure Overview

Important folders only:

| Folder | Purpose |
| --- | --- |
| `backend/` | Main Express + MongoDB API server |
| `backend/src/controllers/` | Business logic for auth, users, products, sales, reports, dashboard, settings, reservations, and orders |
| `backend/src/models/` | MongoDB schemas such as `User`, `Product`, `Sale`, `Order`, `Reservation`, and `StoreSettings` |
| `backend/src/routes/` | API route registration for all backend modules |
| `backend/src/middleware/` | JWT auth and upload middleware |
| `backend/uploads/` | Uploaded product images and store logo files |
| `frontend/` | Main web dashboard/POS application built with React + Vite |
| `frontend/src/pages/` | Route-level pages such as dashboards, products, orders, reports, POS, and settings |
| `frontend/src/components/` | Reusable UI pieces such as layout, modals, charts, pagination, and route guards |
| `frontend/src/context/` and `frontend/src/state/` | Web app state for auth, settings, and toasts |
| `frontend/functions/` | Edge/serverless proxy handlers for `/api` and `/uploads` |
| `app/` | Expo Router shell for the root mobile app |
| `src/` | Main mobile application code used by `ReserveApp.js` |
| `src/screens/` | Mobile screens for home, cart, checkout, orders, login, register, and profile |
| `src/services/` | Mobile API, realtime, and storage helpers |
| `coys-reserve/` | Separate older mobile app focused on reservations and using placeholder/mock API logic |
| `assets/` | App icons, splash images, and other static assets |
| `dist/`, `coys-reserve/dist-web/`, `coys-reserve/dist-test/` | Build outputs, not source code |
| `mongo-merged-copy/`, `mongo-service-copy/`, `mongo-temp-copy/` | Local MongoDB data directories or copies; these are operational artifacts, not application source |

Notes:
- The codebase contains more than one frontend/mobile surface.
- The currently integrated backend matches the `backend/` folder, the web app in `frontend/`, and the root mobile app in `src/` plus `ReserveApp.js`.
- `coys-reserve/` looks like a separate prototype or legacy mobile app rather than the main active client.

## 4. Frontend Analysis

### Web frontend

Main web routes are defined in `frontend/src/App.jsx`.

- Public pages:
  - `/` -> `LandingPage`
  - `/menu` -> `MenuPage`
  - `/login` -> `LoginPage`
  - `/register` -> `RegisterPage`
- Authenticated pages:
  - `/admin` -> `AdminDashboard`
  - `/staff` -> `StaffDashboard`
  - `/user` -> `UserDashboard`
  - `/products`, `/categories`, `/brands`, `/suppliers`, `/inventory`, `/users`, `/transactions`, `/reports`, `/settings`, `/pos`, `/orders`, `/profile`, `/receipt/:id`

Main detected pages and their purpose:

- `frontend/src/pages/LandingPage.jsx`: marketing-style homepage and category preview.
- `frontend/src/pages/MenuPage.jsx`: public product catalog browsing.
- `frontend/src/pages/LoginPage.jsx`: login form with demo account autofill buttons for seeded users.
- `frontend/src/pages/RegisterPage.jsx`: customer registration page.
- `frontend/src/pages/AdminDashboard.jsx`: aggregated admin metrics, charts, low-stock panel, and recent transactions.
- `frontend/src/pages/StaffDashboard.jsx`: cashier/staff metrics and recent performance.
- `frontend/src/pages/UserDashboard.jsx`: simple customer dashboard and featured items.
- `frontend/src/pages/ProductsPage.jsx`: product CRUD, filters, image upload, pagination.
- `frontend/src/pages/CategoriesPage.jsx`: category create/list/delete UI.
- `frontend/src/pages/BrandsPage.jsx`: brand CRUD UI.
- `frontend/src/pages/SuppliersPage.jsx`: supplier CRUD UI.
- `frontend/src/pages/UsersPage.jsx`: user management with role-aware behavior.
- `frontend/src/pages/InventoryPage.jsx`: read-only stock list.
- `frontend/src/pages/PosPage.jsx`: point-of-sale screen with cart, tax, payment, and receipt flow.
- `frontend/src/pages/OrdersPage.jsx`: mobile order queue with real-time status updates.
- `frontend/src/pages/TransactionsPage.jsx`: sales history, filters, detail modal, CSV export, and sale cancellation.
- `frontend/src/pages/ReportsPage.jsx`: report summaries, charts, top products, and export actions.
- `frontend/src/pages/ReceiptPage.jsx`: printable receipt page.
- `frontend/src/pages/SettingsPage.jsx`: store info, tax, footer, and logo upload.
- `frontend/src/pages/ProfilePage.jsx`: profile UI, but the update behavior is only partially implemented.

Reusable components detected:

- `frontend/src/components/Layout.jsx`
- `frontend/src/components/PrivateRoute.jsx`
- `frontend/src/components/Modal.jsx`
- `frontend/src/components/ConfirmDialog.jsx`
- `frontend/src/components/Pagination.jsx`
- `frontend/src/components/SimpleChart.jsx`
- `frontend/src/components/DashboardCards.jsx`

State management and UI flow:

- Auth state uses `frontend/src/state/AuthContext.jsx`.
- Settings state uses `frontend/src/context/SettingsContext.jsx`.
- Toast notifications use `frontend/src/context/ToastContext.jsx`.
- HTTP calls are centralized in `frontend/src/utils/api.js`.
- Real-time order updates use `frontend/src/utils/realtime.js`.
- Styling is mostly a shared CSS approach through `frontend/src/styles.css`.

Observed UI behavior:

- Admin and staff share the main operational dashboard layout.
- Customers can browse the menu on the web, but actual end-user ordering is implemented more clearly in the mobile app.
- Print styling exists for receipt output.

Notable frontend gaps:

- `frontend/src/pages/ProfilePage.jsx` contains a simulated update path and references `/users/:id` instead of the more appropriate `/auth/me` flow already available in the backend.
- `frontend/src/pages/CategoriesPage.jsx` supports create and delete, but the backend also supports update and the web page does not expose an edit flow.
- `frontend/src/pages/ProductsPage.jsx` does not expose every model field supported by `backend/src/models/Product.js`, such as `supplier`, `discountPrice`, or `expirationDate`.

### Mobile frontend

The root mobile app is driven by `ReserveApp.js` plus `src/navigation/AppNavigator.js`.

- Active mobile tabs and screens:
  - Home
  - Cart
  - Orders
  - Profile
  - Product details
  - Checkout
  - Login
  - Register
- Active mobile purpose:
  - browse products
  - maintain cart state
  - submit customer orders to the backend
  - track order status, including guest tracking

Important mobile files:

- `ReserveApp.js`
- `src/navigation/AppNavigator.js`
- `src/context/CartContext.js`
- `src/services/api.js`
- `src/services/realtime.js`
- `src/services/storage.js`
- `src/screens/HomeScreen.js`
- `src/screens/CartScreen.js`
- `src/screens/CheckoutScreen.js`
- `src/screens/OrdersScreen.js`
- `src/screens/OrderDetailsScreen.js`
- `src/screens/ProfileScreen.js`
- `src/screens/LoginScreen.js`
- `src/screens/RegisterScreen.js`

Mobile inconsistency found:

- `src/screens/ReservationScreen.js`, `src/screens/CustomerDetailsScreen.js`, and `src/screens/StatusScreen.js` still exist, but they are not wired into the active navigator.
- Those screens import reservation API helpers that are not exported by the active `src/services/api.js`.
- This suggests a partially removed or unfinished reservation flow in the current mobile app.

## 5. Backend Analysis

Server entry and bootstrapping:

- Main server entry: `backend/src/server.js`
- Database connection: `backend/src/config/db.js`
- Environment-driven port: `process.env.PORT || 5000`
- Static upload serving: `/uploads`
- Realtime WebSocket path: `/ws`

Detected backend route modules:

- `backend/src/routes/authRoutes.js`
- `backend/src/routes/userRoutes.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/categoryRoutes.js`
- `backend/src/routes/brandRoutes.js`
- `backend/src/routes/supplierRoutes.js`
- `backend/src/routes/saleRoutes.js`
- `backend/src/routes/reportRoutes.js`
- `backend/src/routes/settingsRoutes.js`
- `backend/src/routes/dashboardRoutes.js`
- `backend/src/routes/reservationRoutes.js`
- `backend/src/routes/orderRoutes.js`

Detected controllers and what they do:

- `backend/src/controllers/authController.js`
  - register, login, get current user, update current user
- `backend/src/controllers/userController.js`
  - list, create, update, delete users with role-aware restrictions
- `backend/src/controllers/productController.js`
  - product CRUD, search, low-stock view, inventory log creation on product stock changes
- `backend/src/controllers/categoryController.js`
  - category CRUD
- `backend/src/controllers/brandController.js`
  - brand CRUD
- `backend/src/controllers/supplierController.js`
  - supplier CRUD
- `backend/src/controllers/saleController.js`
  - POS sale creation, history, sale cancellation, stock deduction/restoration
- `backend/src/controllers/reportController.js`
  - summary reports, period reports, sales detail reports, product reports, CSV export
- `backend/src/controllers/settingsController.js`
  - public and private store settings, logo upload, store tax/footer configuration
- `backend/src/controllers/dashboardController.js`
  - admin dashboard data and staff dashboard data
- `backend/src/controllers/reservationController.js`
  - reservation creation and per-user reservation listing
- `backend/src/controllers/orderController.js`
  - customer order creation, order listing, guest tracking, order status changes, stock reservation, sale generation on completion, realtime notifications

Detected middleware:

- `backend/src/middleware/authMiddleware.js`
  - `protect`
  - `optionalAuth`
  - `authorizeRoles`
- `backend/src/middleware/uploadMiddleware.js`
  - image upload handling and file-type filtering

Detected service/util layers:

- `backend/src/realtime/realtimeServer.js`
  - WebSocket auth and event broadcasting
- `backend/src/utils/generateToken.js`
  - JWT token generation
- `backend/src/utils/orderRules.js`
  - allowed order status transitions
- `backend/src/utils/orderPresentation.js`
  - API/socket-safe order payload formatting

Authentication flow:

1. User registers or logs in through `/api/auth/register` or `/api/auth/login`.
2. Backend validates credentials and returns a JWT.
3. Web frontend stores the token in `localStorage`.
4. Mobile app stores auth in AsyncStorage through `src/services/storage.js`.
5. Protected backend routes require `Authorization: Bearer <token>`.
6. Role restrictions are enforced for admin/staff-only areas.

Backend structure observations:

- The backend is modular and follows a controller + route + model pattern consistently.
- Orders and sales are separate concepts:
  - `Sale` represents POS/completed sale data.
  - `Order` represents customer order lifecycle, especially mobile ordering.
- `StoreSettings` is used by both the web app and mobile app.
- Reservation support exists in the backend but is not strongly integrated into the currently active frontends.

## 6. HTTP / URL Structure

### Web pages detected

| Route | Purpose | Related file |
| --- | --- | --- |
| `/` | Public landing page | `frontend/src/pages/LandingPage.jsx` |
| `/menu` | Public catalog/menu | `frontend/src/pages/MenuPage.jsx` |
| `/login` | User login | `frontend/src/pages/LoginPage.jsx` |
| `/register` | User registration | `frontend/src/pages/RegisterPage.jsx` |
| `/admin` | Admin dashboard | `frontend/src/pages/AdminDashboard.jsx` |
| `/staff` | Staff dashboard | `frontend/src/pages/StaffDashboard.jsx` |
| `/user` | Customer dashboard | `frontend/src/pages/UserDashboard.jsx` |
| `/products` | Product management | `frontend/src/pages/ProductsPage.jsx` |
| `/categories` | Category management | `frontend/src/pages/CategoriesPage.jsx` |
| `/brands` | Brand management | `frontend/src/pages/BrandsPage.jsx` |
| `/suppliers` | Supplier management | `frontend/src/pages/SuppliersPage.jsx` |
| `/inventory` | Stock overview | `frontend/src/pages/InventoryPage.jsx` |
| `/users` | User management | `frontend/src/pages/UsersPage.jsx` |
| `/pos` | Point-of-sale interface | `frontend/src/pages/PosPage.jsx` |
| `/orders` | Order queue and tracking | `frontend/src/pages/OrdersPage.jsx` |
| `/transactions` | Sales history | `frontend/src/pages/TransactionsPage.jsx` |
| `/reports` | Reports and exports | `frontend/src/pages/ReportsPage.jsx` |
| `/settings` | Store settings | `frontend/src/pages/SettingsPage.jsx` |
| `/profile` | Profile page | `frontend/src/pages/ProfilePage.jsx` |
| `/receipt/:id` | Printable receipt | `frontend/src/pages/ReceiptPage.jsx` |

### API endpoints detected

| Method | Route | Purpose | Related file |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Register a customer account | `backend/src/routes/authRoutes.js` |
| `POST` | `/api/auth/login` | Login and issue JWT | `backend/src/routes/authRoutes.js` |
| `GET` | `/api/auth/me` | Get current authenticated user | `backend/src/routes/authRoutes.js` |
| `PUT` | `/api/auth/me` | Update current authenticated user | `backend/src/routes/authRoutes.js` |
| `GET` | `/api/users` | List users | `backend/src/routes/userRoutes.js` |
| `POST` | `/api/users` | Create user | `backend/src/routes/userRoutes.js` |
| `PUT` | `/api/users/:id` | Update user | `backend/src/routes/userRoutes.js` |
| `DELETE` | `/api/users/:id` | Delete user | `backend/src/routes/userRoutes.js` |
| `GET` | `/api/products` | List/search products | `backend/src/routes/productRoutes.js` |
| `GET` | `/api/products/low-stock` | Get low-stock products | `backend/src/routes/productRoutes.js` |
| `POST` | `/api/products` | Create product | `backend/src/routes/productRoutes.js` |
| `PUT` | `/api/products/:id` | Update product | `backend/src/routes/productRoutes.js` |
| `DELETE` | `/api/products/:id` | Delete product | `backend/src/routes/productRoutes.js` |
| `GET` | `/api/categories` | List categories | `backend/src/routes/categoryRoutes.js` |
| `POST` | `/api/categories` | Create category | `backend/src/routes/categoryRoutes.js` |
| `PUT` | `/api/categories/:id` | Update category | `backend/src/routes/categoryRoutes.js` |
| `DELETE` | `/api/categories/:id` | Delete category | `backend/src/routes/categoryRoutes.js` |
| `GET` | `/api/brands` | List brands | `backend/src/routes/brandRoutes.js` |
| `POST` | `/api/brands` | Create brand | `backend/src/routes/brandRoutes.js` |
| `PUT` | `/api/brands/:id` | Update brand | `backend/src/routes/brandRoutes.js` |
| `DELETE` | `/api/brands/:id` | Delete brand | `backend/src/routes/brandRoutes.js` |
| `GET` | `/api/suppliers` | List suppliers | `backend/src/routes/supplierRoutes.js` |
| `POST` | `/api/suppliers` | Create supplier | `backend/src/routes/supplierRoutes.js` |
| `PUT` | `/api/suppliers/:id` | Update supplier | `backend/src/routes/supplierRoutes.js` |
| `DELETE` | `/api/suppliers/:id` | Delete supplier | `backend/src/routes/supplierRoutes.js` |
| `GET` | `/api/sales` | List sales | `backend/src/routes/saleRoutes.js` |
| `GET` | `/api/sales/mine` | List cashier sales | `backend/src/routes/saleRoutes.js` |
| `GET` | `/api/sales/:id` | Get one sale | `backend/src/routes/saleRoutes.js` |
| `POST` | `/api/sales` | Create POS sale | `backend/src/routes/saleRoutes.js` |
| `POST` | `/api/sales/:id/cancel` | Cancel sale and restore stock | `backend/src/routes/saleRoutes.js` |
| `GET` | `/api/reports/summary` | Summary report | `backend/src/routes/reportRoutes.js` |
| `GET` | `/api/reports/period` | Report by period/range | `backend/src/routes/reportRoutes.js` |
| `GET` | `/api/reports/sales` | Sales reporting data | `backend/src/routes/reportRoutes.js` |
| `GET` | `/api/reports/products` | Product/inventory reporting data | `backend/src/routes/reportRoutes.js` |
| `GET` | `/api/reports/csv` | CSV export endpoint | `backend/src/routes/reportRoutes.js` |
| `GET` | `/api/settings/public` | Public store settings | `backend/src/routes/settingsRoutes.js` |
| `GET` | `/api/settings` | Private store settings | `backend/src/routes/settingsRoutes.js` |
| `PUT` | `/api/settings` | Update store settings | `backend/src/routes/settingsRoutes.js` |
| `GET` | `/api/dashboard/admin` | Admin dashboard data | `backend/src/routes/dashboardRoutes.js` |
| `GET` | `/api/dashboard/staff` | Staff dashboard data | `backend/src/routes/dashboardRoutes.js` |
| `GET` | `/api/reservations` | List current user's reservations | `backend/src/routes/reservationRoutes.js` |
| `POST` | `/api/reservations` | Create reservation | `backend/src/routes/reservationRoutes.js` |
| `GET` | `/api/orders/public/:orderNumber` | Guest order tracking | `backend/src/routes/orderRoutes.js` |
| `GET` | `/api/orders/mine` | Current user's orders | `backend/src/routes/orderRoutes.js` |
| `GET` | `/api/orders` | Staff/admin order list | `backend/src/routes/orderRoutes.js` |
| `GET` | `/api/orders/:id` | Order detail | `backend/src/routes/orderRoutes.js` |
| `POST` | `/api/orders` | Create customer order | `backend/src/routes/orderRoutes.js` |
| `PATCH` | `/api/orders/:id/status` | Update order status | `backend/src/routes/orderRoutes.js` |

Related non-HTTP endpoints:

- `GET /uploads/...` serves uploaded images from `backend/uploads/`.
- `WS /ws` serves real-time order updates via `backend/src/realtime/realtimeServer.js`.

## 7. Database Analysis

- Database type detected: MongoDB
- Connection file: `backend/src/config/db.js`
- Configured database name: `mern_pos`

Detected schemas/models:

| Model | Purpose | Important fields | Relationships |
| --- | --- | --- | --- |
| `User` | Authenticated system user | `name`, `email`, `password`, `role`, `isActive`, `phone`, `address`, `lastLogin`, `loyaltyPoints` | Referenced by `Sale`, `Order`, `Reservation`, `InventoryLog` |
| `Category` | Product grouping | `name`, `description` | Referenced by `Product` |
| `Brand` | Product brand | `name`, `description`, `isActive` | Referenced by `Product` |
| `Supplier` | Supplier/vendor record | `name`, `contactPerson`, `email`, `phone`, `address`, `notes`, `isActive` | Referenced by `Product` |
| `Product` | Sellable inventory item | `name`, `barcode`, `sku`, `category`, `brand`, `supplier`, `price`, `costPrice`, `stockQuantity`, `reorderLevel`, `unit`, `imageUrl`, `discountPrice`, `expirationDate`, `isActive`, `isArchived` | References `Category`, `Brand`, `Supplier` |
| `Sale` | POS or completed sale record | `invoiceNumber`, `customer`, `cashier`, `order`, `source`, `items`, `subtotal`, `discount`, `tax`, `total`, `paymentMethod`, `status` | References `User` and `Order` |
| `Order` | Customer order lifecycle record | `orderNumber`, `customerUser`, `customer`, `items`, `subtotal`, `taxRate`, `taxAmount`, `total`, `paymentMethod`, `paymentStatus`, `status`, `sale`, `source`, `timeline` | References `User`, `Product`, `Sale` |
| `Reservation` | Reservation booking record | `reference`, `user`, `dateKey`, `dateLabel`, `timeSlot`, `items`, `customer`, `notes`, `total`, `status` | References `User` |
| `StoreSettings` | Store-wide settings | `name`, `address`, `phone`, `email`, `currency`, `taxRate`, `receiptFooter`, `logoUrl` | Shared across frontend and backend |
| `InventoryLog` | Inventory change audit | `product`, `type`, `quantityChange`, `previousQuantity`, `newQuantity`, `note`, `createdBy` | References `Product`, `User` |
| `Cart` | Cart storage model | `user`, `items` | Not confirmed in active use |
| `AuditLog` | Audit log model | event-style tracking fields | Not confirmed in active use |

Database observations:

- The schema design matches a commerce/POS domain, not a student information domain.
- `Order` and `Sale` separation supports both customer ordering and cashier-driven POS operations.
- Inventory movement is partially audited through `InventoryLog`.
- `Cart` and `AuditLog` were found in the models folder but were not confirmed as active parts of the main request flow from the scanned code.

## 8. Security Features

Authentication and authorization:

- JWT-based authentication is implemented in `backend/src/middleware/authMiddleware.js`.
- Tokens are generated in `backend/src/utils/generateToken.js` with a `7d` expiration.
- Role-based authorization exists through `authorizeRoles(...)`.
- Inactive users are blocked by the `protect` middleware.

Password handling:

- Passwords are hashed with `bcryptjs`.
- Login compares hashed password values before issuing tokens.

Validation and request checks:

- `express-validator` is used in route definitions.
- Upload middleware filters file type and file size for images.
- Order status changes are constrained by `backend/src/utils/orderRules.js`.

CORS and environment configuration:

- CORS is enabled in `backend/src/server.js` using `process.env.CLIENT_URL`.
- Sensitive configuration is environment-based through `.env` patterns.

Security-related strengths:

- Protected routes are consistently guarded.
- Role-aware behavior exists in both frontend routing and backend authorization.
- Guest order tracking uses an additional access token, not only the order number.

Weak or missing parts detected:

- Web auth token storage uses `localStorage`, which is simpler but weaker than `httpOnly` cookie-based auth.
- No rate limiting was found on login or high-traffic endpoints.
- No CSRF protection was found; this matters more if the app later moves to cookie-based auth.
- Guest order access token is passed in the query string for public tracking, which can leak via logs or shared URLs.
- Public upload serving is expected for images, but access control is not granular.
- No automated security tests were found.
- A real `backend/.env` file exists in the workspace; its contents were not inspected here, but storing live secrets in the repo workspace is still an operational risk if version control hygiene is weak.

## 9. Features Found in the System

- Login: found in web, mobile, and backend auth flow.
- Dashboard: found for admin, staff, and customer-facing views.
- Student management: not found.
- Product/inventory management: found.
- Sales/POS: found.
- Reports: found with charts and CSV export.
- Attendance: not found.
- User roles: found with `admin`, `staff`, and `user`.
- Search/filter/export: found across products, transactions, orders, and reports.
- Reservation flow: partially found in backend and older mobile app, but inconsistent in the active root mobile app.
- Real-time order tracking: found through WebSockets.
- Receipt printing: found in web frontend.
- Store settings/logo/tax configuration: found.
- Guest checkout and guest order tracking: found in mobile order flow.

## 10. Comparison with Reference Manuscript

### Present in manuscript and found in code

- Login/authentication
- Dashboard
- Backend API structure
- Frontend user interface
- Database-backed records
- Reports/export capability
- Security features such as password hashing and protected routes

### Present in manuscript but not found in code

- Online student management purpose
- Student records management
- Attendance management
- Student-focused reports or academic modules
- Any confirmed student table/schema
- Any confirmed class, course, grade, adviser, or enrollment module

These items are better labeled as:
- Planned in manuscript but not found in code

### Found in code but not described in manuscript

- POS checkout and cashier workflow
- Product, category, brand, and supplier management
- Inventory stock tracking and low-stock monitoring
- Receipt printing
- Mobile ordering and guest order tracking
- Real-time order status updates over WebSockets
- Store settings and logo upload
- Reservation support and a separate older reservation mobile app

These items are better labeled as:
- Found in code but not described in manuscript

## 11. Important Files Summary

| File path | Purpose | Notes |
| --- | --- | --- |
| `backend/src/server.js` | Express server bootstrap | Registers API routes, uploads, CORS, and realtime server |
| `backend/src/config/db.js` | MongoDB connection | Connects to `MONGO_URI` using database name `mern_pos` |
| `backend/src/middleware/authMiddleware.js` | Auth and role middleware | Core JWT protection layer |
| `backend/src/controllers/orderController.js` | Order lifecycle logic | Strongest backend feature area; handles stock reservation, guest tracking, and sale generation |
| `backend/src/controllers/saleController.js` | POS sales logic | Handles cashier sales and cancellation |
| `backend/src/controllers/reportController.js` | Reporting and CSV export | Key reporting module |
| `backend/src/models/Product.js` | Product schema | Shows full inventory fields supported by backend |
| `backend/src/models/Order.js` | Order schema | Shows customer order workflow and timeline structure |
| `backend/src/models/Sale.js` | Sale schema | Distinct from customer order schema |
| `backend/src/models/StoreSettings.js` | Store settings schema | Shared by web and mobile |
| `backend/src/realtime/realtimeServer.js` | WebSocket server | Real-time order status feature |
| `frontend/src/App.jsx` | Main route map for web app | Best single file for page coverage |
| `frontend/src/utils/api.js` | Web API client | Adds JWT from `localStorage` |
| `frontend/src/pages/PosPage.jsx` | POS screen | Core cashier workflow |
| `frontend/src/pages/OrdersPage.jsx` | Order monitoring UI | Uses realtime updates |
| `frontend/src/pages/ReportsPage.jsx` | Reporting UI | Connects to report endpoints |
| `frontend/src/pages/ProfilePage.jsx` | Profile UI | Partially incomplete; current update path is only simulated |
| `ReserveApp.js` | Root mobile app bootstrap | Restores auth/guest state and mounts mobile navigation |
| `src/navigation/AppNavigator.js` | Active mobile navigation | Current mobile flow is order-centric, not reservation-centric |
| `src/services/api.js` | Active mobile API client | Real backend integration for products, auth, and orders |
| `src/screens/CheckoutScreen.js` | Mobile checkout | Creates orders and stores guest tracking data |
| `coys-reserve/src/services/api.js` | Legacy reservation API layer | Uses placeholder/mock logic rather than the active backend |
| `start.bat` | Local launch helper | Starts MongoDB, backend, and frontend for local development |

## Environment Variables Detected

Confirmed from scanned code:

| Variable | Where used | Purpose |
| --- | --- | --- |
| `PORT` | `backend/src/server.js` | Backend port |
| `MONGO_URI` | `backend/src/config/db.js` | MongoDB connection string |
| `JWT_SECRET` | `backend/src/middleware/authMiddleware.js`, `backend/src/utils/generateToken.js` | JWT signing and verification |
| `CLIENT_URL` | `backend/src/server.js` | CORS origin |
| `NODE_ENV` | `backend/src/server.js` | Environment mode |
| `BACKEND_URL` | `frontend/functions/api/[[path]].js`, `frontend/functions/uploads/[[path]].js` | Proxy target for deployed web frontend |
| `EXPO_PUBLIC_API_URL` | `.env.local`, `src/services/api.js` | Mobile API base URL |
| `EXPO_OS` | Expo starter components | Platform-specific UI behavior, not core business logic |

Files found:

- `backend/.env.example`
- `backend/.env`
- `.env.local`

## Third-Party APIs or Services

- MongoDB is the primary external data service.
- No third-party business API integration was confirmed from the scanned code.
- WebSocket support is self-hosted through the Node backend.
- `frontend/functions/` suggests a serverless proxy layer for deployment, likely Cloudflare Pages style functions, but the exact host is not confirmed from scanned code.

## Build/Run Instructions

Detected local development paths:

1. Backend
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. Web frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`
3. Root mobile app
   - `npm install`
   - `npx expo start`
4. Combined local launcher
   - `start.bat`

Notes:

- `start.bat` attempts to start MongoDB and then launch the backend and frontend.
- The backend expects MongoDB to be available and uses `backend/.env` or `.env.example` style configuration.
- The web frontend proxies `/api` and `/uploads` to `http://localhost:5000` during local development via `frontend/vite.config.js`.

## Screenshot File Locations

- No dedicated system screenshot folder was confirmed from the scanned code.
- `assets/images/` contains app icons and splash assets, not documentation screenshots of the running system.
- If screenshots are required for the manuscript, they still need to be captured from the running application.

## Deployment-Related Files

- `frontend/functions/api/[[path]].js`
- `frontend/functions/uploads/[[path]].js`
- `frontend/vite.config.js`
- `app.json`
- `eas.json`
- `start.bat`

Deployment observations:

- The web app includes proxy functions for `/api` and `/uploads`, which is useful for static hosting plus backend forwarding.
- Mobile deployment is prepared through Expo configuration files.
- No Dockerfile, compose file, or confirmed production infrastructure manifest was found.

## 12. Missing or Incomplete Parts

- No manuscript `.docx` file was found in the workspace, so document comparison could only use the user-provided manuscript summary.
- The actual codebase does not implement a student management system. Its real domain is retail/restaurant POS, inventory, and ordering.
- `frontend/src/pages/ProfilePage.jsx` appears incomplete because profile updates are simulated instead of using the backend's real `/api/auth/me` update route.
- `frontend/src/pages/CategoriesPage.jsx` lacks an edit flow even though `PUT /api/categories/:id` exists.
- `frontend/src/pages/ProductsPage.jsx` does not expose some supported backend fields such as `supplier`, `discountPrice`, and `expirationDate`.
- The active root mobile app still contains reservation-related screens that are not connected to navigation and reference missing API exports.
- The separate `coys-reserve/` app uses placeholder/mock API logic and appears to be a prototype or older branch of the product.
- `backend/src/models/Cart.js` and `backend/src/models/AuditLog.js` were found but not confirmed as active features.
- No automated tests were found for backend, frontend, or mobile logic.
- No dedicated screenshot/documentation assets were found.
- Workspace hygiene is mixed because source code, build outputs, `node_modules`, and MongoDB data copies all exist in the same overall folder tree.
- Inventory logging is present for product stock changes and order stock reservation, but it was not confirmed in the POS sale controller path, so inventory audit coverage may be inconsistent.

## 13. How the System Works

Detected end-to-end flow from the scanned code:

1. Login
   - Users register or log in through `/api/auth/register` and `/api/auth/login`.
   - Web stores the JWT in `localStorage`.
   - Mobile restores auth or guest mode through AsyncStorage.
2. Dashboard
   - Admin users see business-wide summaries, low-stock data, charts, and recent transactions.
   - Staff users see their personal sales metrics.
   - Customer users see a lighter dashboard and product browsing entry point.
3. Data management
   - Admin/staff manage products, brands, suppliers, users, and categories through CRUD pages.
   - The POS screen lets staff create direct sales and print receipts.
   - The mobile app lets customers browse items, build a cart, and place orders.
4. Reports
   - Sales and product reports are fetched from `/api/reports/...`.
   - The web UI displays summaries, charts, top products, and CSV export actions.
5. Database
   - MongoDB stores users, products, sales, orders, reservations, settings, and inventory logs.
   - Orders reserve stock and can later become completed sales.
   - Store settings affect tax and branding across clients.

Practical flow summary:

- Web staff workflow:
  - login -> dashboard -> manage inventory/users/settings -> process POS sale -> view transactions/reports
- Mobile customer workflow:
  - browse products -> cart -> checkout -> create order -> track status in realtime

## 14. Suggested Improvements

- Code structure:
  - Choose one active mobile codepath and remove or archive the unused reservation prototype to reduce confusion.
  - Separate backup/build/data folders from the main application repository if possible.
- Security:
  - Consider `httpOnly` cookie auth for the web app or strengthen token handling.
  - Add rate limiting for login and public endpoints.
  - Avoid passing guest access tokens in query strings if a safer pattern is possible.
- UI/UX:
  - Finish the real profile update flow.
  - Add category editing to match backend capability.
  - Decide whether product fields like supplier, discount price, and expiration date should be exposed or removed.
- Performance:
  - Add pagination and selective loading consistently across heavy list pages and mobile catalog flows.
  - Review whether very large product fetches such as POS loading `limit=500` should stay that way in production.
- Data integrity:
  - Ensure all stock-affecting actions create consistent inventory logs.
  - Add stronger audit logging if administrative traceability is important.
- Documentation:
  - Update the manuscript to match the actual system domain, or update the codebase to match the manuscript if the manuscript is the real target.
  - Replace the default Expo README with project-specific setup instructions.
- Deployment readiness:
  - Add production deployment documentation and environment setup steps.
  - Add automated tests for critical auth, order, sale, and report flows.

## 15. Conclusion

The scanned codebase is a multi-surface commerce application centered on POS, inventory, customer ordering, reporting, and store configuration. Its strongest implemented areas are the Express/Mongo backend, the React web admin/POS frontend, and the root mobile ordering flow with guest tracking and realtime order updates.

It does not match the provided manuscript's student management theme. The most accurate conclusion from the code is that this system is a retail or restaurant management platform with some leftover reservation prototype code and several incomplete or duplicated parts that should be consolidated before formal documentation or deployment.
