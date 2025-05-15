from typing import Dict, List, Optional, Any
import datetime
from pymongo import MongoClient
from pymongo.collection import Collection
from app.config.settings import settings

from bson.objectid import ObjectId

class MongoDBService:
   def __init__(self):
    try:
        # Hardcoded MongoDB connection settings
        mongodb_uri = "mongodb+srv://sjr290904:290904sept@cluster0.a87nnrd.mongodb.net/fundchat"
        db_name = "fundchat"
        
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.funds_collection = self.db["funds"]
        self.documents_collection = self.db["documents"]
        print(f"Connected to MongoDB: {db_name}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        self.client = None
        self.db = None
            
    def create_or_update_fund(self, fund_id: str, metadata: Optional[Dict] = None) -> str:
        """Create a new fund or update existing one"""
        if self.db is None:
            print("MongoDB not connected")
            return fund_id
            
        fund_data = {
            "updated_at": datetime.datetime.utcnow()
        }
        
        if metadata:
            fund_data.update(metadata)
            
        fund_object_id = ObjectId(fund_id)
            
        # Check if fund exists
        existing_fund = self.funds_collection.find_one({"_id": fund_object_id})
        
        if existing_fund:
            # Update existing fund
            self.funds_collection.update_one(
                {"_id": fund_object_id},
                {"$set": fund_data}
            )
        else:
            print(f"Warning: Fund with ID {fund_id} not found for update in create_or_update_fund.")
            return fund_id

        return fund_id
    
    def add_document_to_fund(self, fund_id: str, doc_data: Dict[str, Any]) -> str:
        """Add document metadata to a fund"""
        if self.db is None:
            print("MongoDB not connected")
            return ""
            
        doc_data["fund_id"] = fund_id
        doc_data["created_at"] = datetime.datetime.utcnow()
        
        result = self.documents_collection.insert_one(doc_data)
        
        # Increment document count for fund
        self.funds_collection.update_one(
            {"_id": ObjectId(fund_id)},
            {"$inc": {"document_count": 1}}
        )
        
        return str(result.inserted_id)
    
    def update_fund_summary(self, fund_id: str, summary: str) -> bool:
        """Update the summary for a fund"""
        if self.db is None:
            print("MongoDB not connected")
            return False
            
        result = self.funds_collection.update_one(
            {"_id": ObjectId(fund_id)},
            {"$set": {"summary": summary, "updated_at": datetime.datetime.utcnow()}}
        )
        
        return result.modified_count > 0
    
    def get_fund(self, fund_id: str):
        try:
            print(f"Fetching fund with id: {fund_id}")
            object_id = ObjectId(fund_id)
            print(f"Converted to ObjectId: {object_id}")
            fund = self.db.funds.find_one({"_id": object_id})
            if fund:
                print("Fund found:", fund)
            else:
                print("No fund found with that id.")
            return fund
        except Exception as e:
            print(f"Error fetching fund {fund_id}: {e}")
            return None
   
    def get_fund_documents(self, fund_id: str) -> List[Dict]:
        """Get all documents for a fund"""
        if self.db is None:
            print("MongoDB not connected")
            return []
            
        return list(self.documents_collection.find({"fund_id": fund_id}))
    
    def list_funds(self) -> List[Dict]:
        """Get a list of all funds"""
        if self.db is None:
            print("MongoDB not connected")
            return []
        
        try:
            # Make sure we're using the funds_collection attribute
            funds = list(self.funds_collection.find({}))
            print(f"Found {len(funds)} funds in database")
            return funds
        except Exception as e:
            print(f"Error listing funds: {e}")
            return []
    
    def create_fund(self, fund_data):
        """
        Create a new fund in MongoDB and return its ID
        
        Args:
            fund_data (dict): Fund data including fund_name and summary
        
        Returns:
            str: The ID of the newly created fund, or None if error
        """
        if self.db is None:
            print("MongoDB not connected")
            return None
            
        try:
            # Add default fields required by FundResponse model
            now = datetime.datetime.utcnow()
            fund_data["created_at"] = now
            fund_data["updated_at"] = now
            fund_data["document_count"] = 0
            
            # Ensure summary is present, default to "Empty" if not provided
            if "summary" not in fund_data:
                fund_data["summary"] = "Empty"

            print(f"Attempting to create fund with data: {fund_data}")
            result = self.funds_collection.insert_one(fund_data)
            fund_id = str(result.inserted_id)
            print(f"Created fund with ID: {fund_id}")
            return fund_id
        except Exception as e:
            print(f"Error creating fund: {e}")
            return None