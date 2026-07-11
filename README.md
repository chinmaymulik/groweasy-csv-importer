# GrowEasy AI CSV Importer

An intelligent, full-stack CSV processing pipeline that leverages AI to automatically extract, format, and map messy lead data into a clean, structured CRM format. 

### Live Demo
* **Frontend Application:** [https://groweasy-csv-importer-sooty.vercel.app/]
* **Backend API (Health Check):** [https://groweasy-csv-importer-ouvq.onrender.com/]

---

## Project Overview
The GrowEasy AI CSV Importer solves the common problem of importing inconsistent, unstructured CSV data into a CRM. Instead of forcing users to manually map columns, this application uses Groq's high-speed Llama 3.1 AI model to interpret the data, enforce strict formatting rules, categorize lead statuses, and gracefully handle missing or merged information.

## Key Features
* **AI-Powered Data Mapping:** Automatically maps raw CSV columns to standardized CRM fields (Name, Email, Phone, Status, etc.).
* **Incremental Batch Processing:** Parses and streams large CSV files in manageable chunks (batches of 10) to prevent API timeouts and payload limits.
* **Smart Retry Mechanism:** Automatically re-attempts failed AI batch conversions using exponential backoff before throwing an error.
* **Virtualized Data Table:** Effortlessly renders thousands of processed rows in the UI without freezing the browser using TanStack Virtualizer.
* **Real-Time Progress Tracking:** Provides a visual progress bar detailing the streaming status of the AI data processing.
* **Modern UI/UX:** Includes drag-and-drop file uploading, smooth animations, and a fully functional Dark Mode toggle.

---

## Tech Stack
* **Frontend Framework:** Next.js (React), TypeScript
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Data Parsing:** PapaParse
* **UI Virtualization:** TanStack React Virtual
* **Backend Runtime:** Node.js, Express.js
* **AI Integration:** Groq SDK (Model: `llama-3.1-8b-instant`)

---

## Architecture & Workflow
1. The user drops a `.csv` file into the frontend dropzone.
2. `PapaParse` reads the file locally in the browser and displays a 5-row preview.
3. Upon confirmation, the frontend splits the parsed data into JSON chunks.
4. Chunks are streamed sequentially to the backend `/api/process-batch` endpoint.
5. The Express backend constructs a strict prompt for the Groq AI model to format the chunk according to CRM rules.
6. The AI returns the perfectly formatted JSON, which the backend sends back to the client.
7. The frontend aggregates the processed chunks and displays them in a high-performance virtualized table.

---

## Local Development Setup

To run this project on your local machine, follow these steps:

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/your-username/groweasy-assignment.git
cd groweasy-assignment
\`\`\`

### 2. Setup the Backend
Navigate to the backend directory and install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`
Create a `.env` file inside the `backend` folder and add your Groq API key:
\`\`\`env
GROQ_API_KEY=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
PORT=5000
\`\`\`
Start the backend server:
\`\`\`bash
node server.js
\`\`\`

### 3. Setup the Frontend
Open a new terminal window, navigate to the frontend directory, and install dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`
*(Optional)* If you want to test the frontend against your local backend instead of the live Render URL, update the fetch URL in `page.tsx` back to `http://localhost:5000/api/process-batch`.

Start the Next.js development server:
\`\`\`bash
npm run dev
\`\`\`
Open `http://localhost:3000` in your browser to view the application.