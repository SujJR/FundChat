import os
import uuid
import base64
from typing import List, Dict, Any, Optional
import time
from pathlib import Path
import datetime

from langchain_community.document_loaders import (
    TextLoader, 
    CSVLoader, 
    Docx2txtLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.schema.document import Document
from unstructured.partition.pdf import partition_pdf
from unstructured.partition.auto import partition  # Import general partition

from app.config.settings import settings
from app.services.mongodb_service_fixed import MongoDBService

class DocumentProcessor:
    def __init__(self):
        self.documents_path = settings.DOCUMENTS_PATH
        self.vectordb_path = settings.VECTORDB_PATH
        
        # Use HuggingFace embeddings with 1024 dimensions to match the existing index
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name="BAAI/bge-large-en-v1.5",  # 1024 dimensions
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
            print("Using HuggingFace embeddings (1024 dimensions)")
        except Exception as e:
            print(f"Error loading HuggingFace embeddings: {e}")
            print("Falling back to dimensionality reduction for OpenAI embeddings")
            
            # Fallback to OpenAI but with dimension reduction
            from langchain_openai import OpenAIEmbeddings
            from sklearn.random_projection import GaussianRandomProjection
            
            class ReducedDimensionEmbeddings(OpenAIEmbeddings):
                def __init__(self, target_dim=1024, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self.reducer = GaussianRandomProjection(n_components=target_dim)
                    self.initialized = False
                    self.target_dim = target_dim
                
                def embed_documents(self, texts):
                    embeddings = super().embed_documents(texts)
                    if not self.initialized:
                        self.reducer.fit(embeddings)
                        self.initialized = True
                    return self.reducer.transform(embeddings).tolist()
                
                def embed_query(self, text):
                    embedding = super().embed_query(text)
                    if not self.initialized:
                        # Create a dummy batch for initialization
                        dummy = [embedding]
                        self.reducer.fit(dummy)
                        self.initialized = True
                    return self.reducer.transform([embedding])[0].tolist()
            
            # Create the reduced dimension embeddings
            self.embeddings = ReducedDimensionEmbeddings(
                target_dim=1024,  # Match Pinecone index dimension
                model="text-embedding-3-small",
                openai_api_key=settings.OPENAI_API_KEY
            )
            print("Using OpenAI embeddings with dimension reduction to 1024")
        
        # Initialize MongoDB service
        self.mongodb = MongoDBService()
        
        os.makedirs(self.documents_path, exist_ok=True)
        os.makedirs(self.vectordb_path, exist_ok=True)
        
        self.vectordb = self._load_or_create_vectordb()
    
    def get_image_data(self, image_path):
        """Retrieve image data from disk by path"""
        try:
            full_path = os.path.join(self.documents_path, image_path)
            if os.path.exists(full_path):
                with open(full_path, "rb") as f:
                    return base64.b64encode(f.read()).decode('utf-8')
            return None
        except Exception as e:
            print(f"Error retrieving image: {e}")
            return None

    def _load_or_create_vectordb(self):
        try:
            from pinecone import Pinecone, ServerlessSpec
            
            # Hardcoded values
            api_key = "pcsk_5toio8_UaQsSqBPmDY7kN3xqTLDhV5YvVMa3woqz3XNSRcj2i4gJstvXe7FbgHGCbkuWC3"
            index_name = "fundchat"
            cloud = "aws"
            region = "us-east-1"
            
            # Use 1024 dimensions to match existing index
            embedding_dimension = 1024
            
            print(f"Connecting to Pinecone with API key of length: {len(api_key)}")
            
            pc = Pinecone(api_key=api_key)
            
            print(f"Checking for index: {index_name}")
            existing_indexes = [idx['name'] for idx in pc.list_indexes()]
            
            if index_name not in existing_indexes:
                print(f"Index not found, creating: {index_name}")
                spec = ServerlessSpec(
                    cloud=cloud,
                    region=region
                )
                pc.create_index(
                    name=index_name,
                    dimension=embedding_dimension,  # Use 1024 dimension to match embeddings
                    metric='cosine',
                    spec=spec
                )
                print(f"Created new Pinecone index: {index_name}")
            else:
                # Check if index has the correct dimension
                index_info = pc.describe_index(index_name)
                print(f"Index info: {index_info}")
                
                # Continue with existing index
                print(f"Using existing Pinecone index: {index_name}")
                
            index = pc.Index(index_name)
            print(f"Successfully connected to index: {index_name}")

            return PineconeVectorStore(
                index=index,
                embedding=self.embeddings,
                namespace="documents"
            )
        
        except Exception as e:
            import traceback
            print(f"Error loading Pinecone vector database: {e}")
            print(f"Detailed error: {traceback.format_exc()}")
            return None
    
    def _add_to_pinecone(self, text: str, metadata: Dict) -> str:
        """
        Add a document to Pinecone with its metadata
        Returns the document ID
        """
        try:
            print(f"Adding document to Pinecone: {metadata.get('file_name')}")
            
            # Create a unique ID for this document
            doc_id = str(uuid.uuid4())
            
            # Split text into smaller chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                separators=["\n\n", "\n", " ", ""],
                keep_separator=True
            )
            
            # Create document chunks
            docs = text_splitter.create_documents([text])
            
            # Add metadata to each chunk
            for i, doc in enumerate(docs):
                # Add common metadata
                chunk_metadata = metadata.copy()
                # Add chunk-specific metadata
                chunk_metadata["chunk_id"] = f"{doc_id}_{i}"
                chunk_metadata["chunk"] = i
                chunk_metadata["total_chunks"] = len(docs)
                chunk_metadata["doc_id"] = doc_id
                # Add file name and type for better retrieval
                chunk_metadata["file_name"] = metadata.get('file_name', 'Unknown')
                
                # Set metadata on document
                doc.metadata = chunk_metadata
            
            # Add documents to vector store
            if self.vectordb:
                self.vectordb.add_documents(docs)
                print(f"Added {len(docs)} chunks to Pinecone for document {doc_id}")
            else:
                raise Exception("Vector database not initialized")
            
            return doc_id
            
        except Exception as e:
            print(f"Error adding document to Pinecone: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def process_file(self, file_path, fund_id):
        """
        Process a file, extract text and metadata, and add to vector store
        """
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            file_name = os.path.basename(file_path)
            
            print(f"Processing file: {file_path}")
            
            try:
                if file_extension == '.pdf':
                    try:
                        # First try the advanced PDF partitioning
                        chunks = partition_pdf(
                            filename=file_path,
                            strategy="hi_res",
                            infer_table_structure=True,
                            chunking_strategy="by_title",
                            max_characters=3000,
                            new_after_n_chars=3000,
                        )
                        text = "\n".join([str(chunk) for chunk in chunks])
                    except Exception as e:
                        print(f"Error during PDF processing: {e}")
                        # Fallback to simpler PDF processing
                        try:
                            import PyPDF2
                            with open(file_path, "rb") as f:
                                pdf_reader = PyPDF2.PdfReader(f)
                                text = ""
                                for page_num in range(len(pdf_reader.pages)):
                                    text += pdf_reader.pages[page_num].extract_text() + "\n"
                        except Exception as pdf_e:
                            print(f"Fallback PDF processing failed: {pdf_e}")
                            text = "Could not extract text from PDF due to OCR error."
                else:
                    # For non-PDFs, use standard partitioning
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read()
            except Exception as e:
                print(f"Error processing file {file_path}: {e}")
                return False
            
            # Add document to Pinecone
            try:
                # Extract document text and metadata
                metadata = {
                    "file_name": file_name,
                    "file_type": file_extension.replace(".", ""),
                    "fund_id": fund_id,
                    "created_at": datetime.datetime.utcnow().isoformat(),
                }
                
                if not text or text.strip() == "":
                    print(f"Warning: Extracted text is empty for {file_path}")
                    return False
                
                # Add to Pinecone
                doc_id = self._add_to_pinecone(text, metadata)
                
                # Add to MongoDB
                from app.services.mongodb_service_fixed import MongoDBService
                mongodb_service = MongoDBService()
                mongodb_service.add_document_to_fund(
                    fund_id=fund_id,
                    doc_data={
                        "file_name": file_name,
                        "file_type": file_extension.replace(".", ""),
                        "doc_id": doc_id,
                        "size_bytes": os.path.getsize(file_path),
                    }
                )
                
                return True
                
            except Exception as e:
                print(f"Error adding document to Pinecone: {e}")
                return False
            
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            import traceback
            traceback.print_exc()
            return False

    def save_file(self, file_content: bytes, original_filename: str) -> str:
        """Save an uploaded file to the documents directory"""
        # Generate a unique filename
        filename, ext = os.path.splitext(original_filename)
        unique_filename = f"{filename}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = os.path.join(self.documents_path, unique_filename)
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return file_path
