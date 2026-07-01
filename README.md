# 👩‍🍳 Pai's Kitchen - Cute AI Pantry-to-Recipe Engine

Welcome to **Pai's Kitchen**, a funky, cute, food-sticker style full-stack web application designed to help you stock your pantry shelves, track expiration dates, and whip up delicious recipes using AI and authentic global culinary databases.

---

## ✨ Key Features

* **🍳 Stock Your Pantry**: Easily search, add, or toggle common ingredients organized by color-coded shelves (Vegetables & Herbs, Meat & Protein, Dairy & Eggs, Grains & Baking, Condiments & Spices).
* **📝 Shopping & Grocery Shelf**: Visual notebook interface containing your currently stocked pantry items, complete with customized quantity labels and expiry alerts.
* **⚠️ Expiry Intelligence**: Analyzes ingredients expiring soon and suggests immediate recipes or preservation techniques to reduce kitchen waste.
* **🌐 World Kitchen**: Scans real-world, authentic global cuisines matching your ingredients using Gemini. It features a custom **fuzzy matching engine** (handles plurals, substrings like "chicken breast" to "chicken", and filters out culinary qualifiers) and pulls verified, live photos from the official **Wikipedia API**.
* **🔬 AI Kitchen Lab**: Concocts custom, tiered recipes (Simple, Everyday Gourmet, Gourmet) tailored to your preferences. Powered by a **multi-model automatic fallback chain** (`gemini-2.5-flash` ➡️ `gemini-2.5-flash-lite` ➡️ `gemini-flash-latest`) to bypass API quota walls seamlessly.
* **💖 Personal Cookbook**: Save your favorite generated recipes or log your own custom culinary creations to a persistent database.

---

## 🛠️ Technology Stack

### Backend
* **FastAPI**: High-performance, asynchronous REST API.
* **SQLAlchemy & SQLite**: Lightweight, zero-configuration local database storing users, preferences, and custom/saved recipes.
* **Google GenAI SDK**: Advanced AI recipe generation and substitution suggestions.
* **Sentence Transformers**: Lightweight semantic search and embeddings for recipe matching.
* **python-dotenv**: Robust, path-resolved configuration environment loader.

### Frontend
* **React + TypeScript + Vite**: Modern, responsive, and blazing-fast client architecture.
* **Tailwind CSS**: Utility-first styling combined with custom playful pastel palettes.
* **Framer Motion**: Smooth sliding accordion shelves, micro-interactions, and springy hover-bounce animations.
* **Lucide React**: Clean and cute vector icons.

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Node.js 18+** installed on your system.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Get your free API key from [Google AI Studio](https://aistudio.google.com/))*
5. Seed the database with initial recipes and start the dev server:
   ```bash
   python seed.py
   python -m uvicorn app.main:app --port 8000 --reload
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (configured with an automatic `/api` proxy to the backend):
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## 🐳 Production Deployment (Unified Docker)

The project is configured for **Unified Deployment**. The FastAPI backend is set up to compile and statically serve the React frontend assets from `frontend/dist` as a single service, eliminating CORS configurations and complex multi-server routing.

You can build and deploy the entire application using the root-level [Dockerfile](Dockerfile):

### 1. Build the Docker Image
```bash
docker build -t pais-kitchen .
```

### 2. Run the Container Locally
```bash
docker run -d -p 8000:8000 --env-file backend/.env --name pais-kitchen-app pais-kitchen
```
Once started, access the complete full-stack app at [http://localhost:8000](http://localhost:8000).

### 3. Deploying to Cloud Hosts
You can deploy this unified Docker container directly to platforms like:
* **Render** (Web Service via Docker)
* **Fly.io** (via `fly launch`)
* **Google Cloud Run**
* **AWS App Runner**
