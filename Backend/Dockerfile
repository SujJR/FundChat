# Use an official Python runtime as a parent image
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    # Poppler-utils for pdf2image (if needed, though unstructured might handle it)
    # poppler-utils \
    # Tesseract for OCR (if unstructured needs it explicitly, often bundled)
    # tesseract-ocr \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

EXPOSE 8000

ENV APP_NAME="FundChat RAG API"
ENV DOCUMENTS_PATH="/app/documents"
ENV VECTORDB_PATH="/app/vectordb"
ENV MONGODB_DB_NAME="fundchat"
ENV PINECONE_INDEX_NAME="fundchat"
ENV PINECONE_CLOUD="aws"
ENV PINECONE_REGION="us-east-1"
ENV PINECONE_NAMESPACE="documents"

RUN mkdir -p /app/documents

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]