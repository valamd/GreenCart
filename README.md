# 🛒🌿 GreenCart

**GreenCart** is a modern web and mobile platform for the **sale and management of organic products**. It offers a seamless experience for customers and efficient tools for administrators, including real-time analytics and secure transactions.

---

## 🚀 Features

### 👥 For Customers
- 🔐 **User Authentication:** Secure sign-up/login with email or social accounts (Google/Facebook).
- 🛍️ **Browse Products:** Easily search and filter by category, price, or availability.
- 🛒 **Shopping Cart:** Manage items in real-time with automatic price calculation.
- 📦 **Order Management:** Place orders, track delivery, and view history.
- ⭐ **Ratings & Reviews:** Share feedback to help the community.

### 🛠️ For Admins
- 📦 **Product Management:** Add/edit/delete products with inventory alerts.
- 📑 **Order Handling:** Monitor and process customer orders.
- 👤 **Customer Insights:** View profiles and activity logs.
- 📊 **Analytics Dashboard:** Track sales and engagement with rich metrics.

---

## 🧰 Tech Stack

### 🖥️ Frontend
- ⚛️ **React.js**
- 🎨 **CSS/SCSS**, **Material-UI**

### 🧪 Backend
- 🟩 **Node.js**
- 🔐 **OAuth2**, **JWT Authentication**

### 🗃️ Database
- 🍃 **MongoDB** (NoSQL)

---

## ⚙️ Installation & Setup

### 🔧 Prerequisites
- ✅ Node.js & npm
- ✅ MongoDB (local/cloud)
- ✅ Git

### 📥 Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/vanshh13/GreenCart.git

2. **Navigate to the Project Directory:**
   ```bash
   cd GreenCart
3. **Install Dependencies:**
      ```bash
   npm install

4. **Set Up Environment Variables:**
   Create a .env file in the root directory and add the following:

env
   MONGO_URI=<your-mongodb-connection-string>
   JWT_SECRET=<your-secret-key>
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   FACEBOOK_APP_ID=<your-facebook-app-id>
   FACEBOOK_APP_SECRET=<your-facebook-app-secret>

5. **Start the Development Server:**
      ```bash
   npm start

   The application will be accessible at http://localhost:3000.

## Contribution Guidelines
1. Fork the repository.
2. Create a new branch for your feature or bug fix:
      ```bash
   git checkout -b feature-name

3. Commit your changes and push to the branch:
      ```bash
   git commit -m "Added feature-name"
   git push origin feature-name

📁 **Project Structure**
GreenCart/<br>
├── 📁 backend/                # Node.js backend files (API, DB config)<br>
│   ├── 📁 config/             # Environment config files<br>
│   ├── 📁 controllers/        # Route controllers for handling <br>
│   ├── 📁 middleware/         # Custom middleware (e.g., auth)<br>
│   ├── 📁 models/             # MongoDB models/schemas<br>
│   ├── 📁 routes/             # Express routes<br>
│   ├── 📁 utils/              # Utility functions (helpers)<br>
│   └── index.js              # Entry point for backend server<br>
│<br>
├── 📁 frontend/               # React frontend source files<br>
│   ├── 📁 public/             # Static public assets<br>
│   ├── 📁 src/<br>
│   │   ├── 📁 assets/         # Images, icons, and styles<br>
│   │   ├── 📁 components/     # Reusable UI components<br>
│   │   ├── 📁 pages/          # Page components (Home, Cart, Login)<br>
│   │   ├── 📁 services/       # API calls and services<br>
│   │   ├── 📁 context/        # Context API for global state<br>
│   │   └── App.js            # Main React app file<br>
│<br>
├── 📄 .env                    # Environment variables<br>
├── 📄 .gitignore              # Ignored files and folders<br>
├── 📄 package.json            # Project metadata and scripts<br>
├── 📄 README.md               # Project documentation<br>
└── 📄 LICENSE                 # License file (if available)<br>

## 🖼️ Screenshots

- 🧑‍💼 **Login Page**  
![Screenshot (369)](https://github.com/user-attachments/assets/2c26e64b-0b94-40f0-a3c8-b9c41d03b858)


### 👤 Customer Side


- 🏠 **Home Page**  
![Screenshot (370)](https://github.com/user-attachments/assets/5e8cf109-b9c3-4cc6-854e-304ce288458c)

- 🗂️ **Product Page**  
![Screenshot (373)](https://github.com/user-attachments/assets/ca370264-acc3-4cdc-90e9-bd801d448f39)

- 💖 **Wishlist Page**  
![Screenshot (374)](https://github.com/user-attachments/assets/91f971d7-1ee1-44e5-82bd-186879222131)
  **Quick view**
  ![Screenshot (375)](https://github.com/user-attachments/assets/f8c48f6b-c788-4244-87d7-fd098d7def8c)

  
- 🛒 **Shopping Cart Page**  
![Screenshot (378)](https://github.com/user-attachments/assets/e9472590-9f81-4daa-91cd-e4facbbad3c9)

- ✍️ **Blog Page**  
![Screenshot (371)](https://github.com/user-attachments/assets/894f4a96-b3f7-4178-832d-b609aba0aea9)

- 🙍‍♂️ **Profile Page**  
![Screenshot (376)](https://github.com/user-attachments/assets/4fa66c4a-6cfc-451a-b2d3-1aadf7f07706)

- **Payment With Razorpay**:
---![Screenshot (319)](https://github.com/user-attachments/assets/d9b63108-1ead-49bd-979e-0641eaae4bd9)


### 🔐 Admin Side


- 🗂️ **Admin Dashboard**  
![Screenshot (379)](https://github.com/user-attachments/assets/907d3600-db0f-4711-adc8-7effedfc231a)

- ➕ **Add Product**  
![Screenshot (380)](https://github.com/user-attachments/assets/a66ec34a-7eed-4c43-af4d-09a0bb9e2ac0)

- 🧾 **Manage Products**  
![Screenshot (381)](https://github.com/user-attachments/assets/8fbc5f8f-4b32-4366-b205-45c84ee23290)

- 📊 **Analysis and Statistics**  
![Screenshot (382)](https://github.com/user-attachments/assets/93ae2ca7-706e-4724-a95b-673ce43b5437)
![Screenshot (383)](https://github.com/user-attachments/assets/706ce55b-576c-4176-9a87-738913929a6a)



