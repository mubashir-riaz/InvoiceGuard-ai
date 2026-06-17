# 🛡️ InvoiceGuard-ai

### _AI-Powered Multi-Modal Freight Invoice Auditor_

InvoiceGuard-ai is an automated freight invoice auditing application that scans carrier freight bills (PDFs), extracts line items using Vision‑LLMs, compares charges against contracted rates, and flags billing discrepancies. When overcharges are detected, it automatically drafts professional dispute emails ready to send.

---

## 📌 Features

- **AI PDF Extraction:** Automatically parses tracking numbers, descriptions, weights, and charged amounts from freight PDFs using vision language models (Groq Llama 4 Scout / Gemini 2.5 Flash).
- **Automated Rate Auditing:** Compares extracted line items against client‑specific contract tariffs (base rate + per‑kg rate) and calculates exact discrepancies.
- **AI‑Powered Dispute Drafting:** Leverages LangChain + Llama 3 to compose formal, carrier‑specific dispute emails with a full breakdown of overcharges.
- **Real‑Time UI Polling:** React Query automatically polls backend processing states, updating status badges and line‑item tables without manual refresh.
- **Full‑Stack Dashboard:** Manage clients, contracts, invoices, and disputes through a modern, responsive React interface built with TailwindCSS.

---

## 🛠️ Tech Stack

- **Frontend:**
  - [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
  - [React Query (TanStack Query v5)](https://tanstack.com/query/latest) for state management and polling.
  - [Vite](https://vite.dev/) as the fast bundler and dev server.
  - [TailwindCSS](https://tailwindcss.com/) for a sleek, modern UI.
  - [Lucide Icons](https://lucide.dev/) for crisp vector iconography.
- **Backend & Worker:**
  - [FastAPI](https://fastapi.tiangolo.com/) for high-performance async REST API endpoints.
  - [SQLAlchemy Async](https://www.sqlalchemy.org/) & [Alembic](https://alembic.otierney.net/) for async ORM and migrations.
  - [PostgreSQL](https://www.postgresql.org/) for data storage.
  - [Redis](https://redis.io/) + [ARQ](https://github.com/samuelcolvin/arq) for high-performance job queueing and background task execution.
  - [LangChain](https://www.langchain.com/) for LLM structured output.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Installation & Run

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/mubashir-riaz/InvoiceGuard-ai.git
   cd InvoiceGuard-ai
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and configure your API keys:

   ```bash
   cp .env.example backend/.env
   ```

   Edit `backend/.env` and add your keys:

   ```env
   LLM_PROVIDER=groq # or gemini
   GROQ_API_KEY=your-groq-key
   GEMINI_API_KEY=your-gemini-key
   ```

   _(You must provide at least one valid key; otherwise extraction will fail.)_

3. **Start the Application:**
   Run Docker Compose to build and launch all containers (Database, Redis, API, Worker, and Frontend):

   ```bash
   docker-compose up --build -d
   ```

4. **Access the Portals:**
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/          # REST Endpoint Routers (invoices, disputes, contracts, clients)
│   │   ├── core/         # DB & configurations
│   │   ├── models/       # SQLAlchemy Async DB Models
│   │   ├── schemas/      # Pydantic Schemas
│   │   └── services/     # Task Queue Services
│   ├── entrypoint.sh     # Migrates and starts FastAPI
│   └── Dockerfile
├── worker/
│   ├── tasks/
│   │   ├── extraction.py # PDF vision OCR & fallback mock builder
│   │   ├── matching.py   # Rate auditing comparison logic
│   │   └── dispute.py    # LangChain email template generator
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout, StatusBadges, FileUpload, DataTables
│   │   ├── hooks/        # React Query hooks with automatic polling
│   │   └── pages/        # Dashboard, InvoiceDetails, Contracts pages
│   └── Dockerfile
└── docker-compose.yml    # Main orchestration configuration
```
