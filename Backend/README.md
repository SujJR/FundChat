# FundChat Backend

This project provides the backend API for FundChat, a Retrieval-Augmented Generation (RAG) system designed to interact with financial fund documents. It allows users to upload fund-related documents, query information from them, and engage in a chat-like interaction based on the document content.

## Features

*   **Document Upload:** Upload PDF and text documents associated with specific financial funds.
*   **Automatic Summarization:** Generates a brief summary of the fund using OpenAI's GPT models based on the uploaded documents.
*   **RAG-based Querying:** Ask questions about a specific fund, and the system retrieves relevant information from the documents to generate an answer.
*   **Chat Interface:** Engage in a conversational Q&A with the documents of a specific fund.
*   **Fund Management:** List available funds and retrieve details about specific funds.
*   **Vector Storage:** Uses Pinecone for efficient similarity search on document embeddings.
*   **Metadata Storage:** Uses MongoDB to store fund information and document metadata.

## Technology Stack

*   **Framework:** FastAPI
*   **Language:** Python
*   **AI/LLM:** OpenAI API (GPT models)
*   **Vector Database:** Pinecone
*   **Database:** MongoDB
*   **Document Processing:** Langchain, PyPDF2, unstructured, etc.
*   **Deployment:** Dockerfile provided for containerization.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd fundchat_backend
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the project root directory with the following structure:

    ```dotenv
    # OpenAI Configuration
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE"

    # Pinecone Configuration
    PINECONE_API_KEY="YOUR_PINECONE_API_KEY_HERE"
    PINECONE_INDEX_NAME="fundchat" # Or your index name
    PINECONE_CLOUD="aws"         # Or your cloud provider
    PINECONE_REGION="us-east-1"    # Or your region
    PINECONE_NAMESPACE="documents" # Optional namespace

    # MongoDB Configuration
    MONGODB_URI="YOUR_MONGODB_CONNECTION_STRING_HERE"
    MONGODB_DB_NAME="fundchat" # Or your database name

    # Optional: File Paths (Defaults are usually sufficient)
    # DOCUMENTS_PATH="./documents"
    # VECTORDB_PATH="./vectordb" # Note: Pinecone is used, this might be legacy or unused
    ```

    *   Replace the placeholder values (`YOUR_..._HERE`) with your actual credentials.
    *   Ensure your MongoDB instance is running and accessible.
    *   Ensure you have a Pinecone account and have created an index matching `PINECONE_INDEX_NAME`.

## Running the Application

1.  **Start the FastAPI server:**
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The API will be available at `http://localhost:8000`.

2.  **API Documentation:**
    Interactive API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

## API Endpoints

*   `GET /`: Welcome message.
*   `POST /api/upload`: Upload documents for a specific fund.
*   `POST /api/query`: Query documents associated with a fund ID.
*   `GET /api/funds`: List all available funds.
*   `GET /api/funds/{fund_id}`: Get details for a specific fund.
*   `POST /api/funds/{fund_id}/chat`: Chat with the documents of a specific fund.
*   `GET /api/mongodb/status`: Check the connection status to MongoDB.

## Docker Support

A `Dockerfile` is included in the project for building a container image. You can build and run the application using Docker:

1.  **Build the image:**
    ```bash
    docker build -t fundchat-backend .
    ```

2.  **Run the container:**
    Make sure to pass the necessary environment variables. You can do this using a `.env` file and the `--env-file` flag:
    ```bash
    docker run -d --env-file .env -p 8000:8000 --name fundchat fundchat-backend
    ```

