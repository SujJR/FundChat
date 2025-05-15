from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "FundChat API"
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "fundchat"
    OPENAI_API_KEY: str = ""
    DOCUMENTS_PATH: str = "./documents"
    DEBUG: bool = True
    
    # Add these missing fields that are in your .env file
    pinecone_api_key: Optional[str] = None
    pinecone_index_name: Optional[str] = None
    pinecone_cloud: Optional[str] = None
    pinecone_region: Optional[str] = None
    pinecone_namespace: Optional[str] = None
    mongodb_uri: Optional[str] = None
    VECTORDB_PATH: Optional[str] = "./vectordb"  # Changed to uppercase to match usage
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in environment variables
        
settings = Settings()