# models.py
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import os

# Set environment variables directly in the Python script
os.environ["PINECONE_API_KEY"] = "pcsk_5toio8_UaQsSqBPmDY7kN3xqTLDhV5YvVMa3woqz3XNSRcj2i4gJstvXe7FbgHGCbkuWC3"
os.environ["PINECONE_INDEX_NAME"] = "fundchat"
os.environ["PINECONE_CLOUD"] = "aws"
os.environ["PINECONE_REGION"] = "us-east-1"
os.environ["PINECONE_NAMESPACE"] = "documents"
os.environ["MONGODB_URI"] = "mongodb+srv://sjr290904:290904sept@cluster0.a87nnrd.mongodb.net/fundchat"
os.environ["MONGODB_DB_NAME"] = "fundchat"
os.environ["DOCUMENTS_PATH"] = "./documents"
os.environ["VECTORDB_PATH"] = "./vectordb"
os.environ["OPENAI_API_KEY"] = "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"

class QueryRequest(BaseModel):
    query: str
    fund_id: str
    top_k: int = 5
    document_ids: Optional[List[str]] = None  # Optional list of document IDs to filter by

class Source(BaseModel):
    chunk_id: Optional[str] = None
    doc_id: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    chunk: Optional[int] = None
    total_chunks: Optional[int] = None
    page_number: Optional[str] = None

class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []

class DocumentUploadResponse(BaseModel):
    filename: str
    status: str
    message: str
    fund_id: Optional[str] = None

class DocumentInfo(BaseModel):
    document_id: str
    file_name: str
    file_type: str
    created_at: datetime

class FundResponse(BaseModel):
    fund_id: str
    fund_name: str
    summary: str = "No summary available"
    created_at: datetime
    updated_at: datetime
    document_count: int = 0
    documents: List[DocumentInfo] = []

class FundListResponse(BaseModel):
    funds: List[FundResponse] = []

class ChatRequest(BaseModel):
    message: str
    top_k: int = 5
    document_ids: Optional[List[str]] = None  # Optional list of document IDs to filter by

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []