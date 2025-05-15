from typing import Dict, List, Optional, Any
import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
import inspect

class MongoDBService:
    def __init__(self):
        try:
            # Hardcoded MongoDB connection settings
            mongodb_uri = MONGODB_URI
            db_name = MONGODB_DB_NAME
            
            self.client = MongoClient(mongodb_uri)
            self.db = self.client[db_name]
            self.funds_collection = self.db["funds"]
            self.documents_collection = self.db["documents"]
            print(f"Connected to MongoDB: {db_name}")
            
            # This is a critical debugging statement
            methods = [method for method in dir(self) if callable(getattr(self, method)) and not method.startswith('__')]
            print(f"Available methods in MongoDBService: {methods}")
            
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            self.client = None
            self.db = None
    
    def create_fund(self, fund_data):
        """Create a new fund in MongoDB"""
        print(f"Inside create_fund method with data: {fund_data}")
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

            print(f"Inserting fund with data: {fund_data}")
            result = self.funds_collection.insert_one(fund_data)
            fund_id = str(result.inserted_id)
            print(f"Created fund with ID: {fund_id}")
            return fund_id
        except Exception as e:
            print(f"Error creating fund: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def list_funds(self):
        """Get a list of all funds"""
        print("Inside list_funds method")
        if self.db is None:
            print("MongoDB not connected")
            return []
        
        try:
            funds = list(self.funds_collection.find({}))
            print(f"Found {len(funds)} funds in database")
            return funds
        except Exception as e:
            print(f"Error listing funds: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_fund(self, fund_id):
        """Get a fund by ID"""
        print(f"Inside get_fund method with id: {fund_id}")
        if self.db is None:
            print("MongoDB not connected")
            return None
        
        try:
            object_id = ObjectId(fund_id)
            fund = self.db.funds.find_one({"_id": object_id})
            if fund:
                print(f"Found fund: {fund}")
            else:
                print("No fund found with that ID")
            return fund
        except Exception as e:
            print(f"Error getting fund: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def add_document_to_fund(self, fund_id, doc_data):
        """Add a document to a fund"""
        print(f"Inside add_document_to_fund with fund_id: {fund_id}")
        if self.db is None:
            print("MongoDB not connected")
            return None
        
        try:
            doc_data["fund_id"] = fund_id
            doc_data["created_at"] = datetime.datetime.utcnow()
            
            result = self.documents_collection.insert_one(doc_data)
            
            # Increment document count for fund
            self.funds_collection.update_one(
                {"_id": ObjectId(fund_id)},
                {"$inc": {"document_count": 1}}
            )
            
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error adding document to fund: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def update_fund_summary(self, fund_id, summary):
        """Update the summary for a fund"""
        print(f"Inside update_fund_summary with fund_id: {fund_id}")
        if self.db is None:
            print("MongoDB not connected")
            return False
        
        try:
            result = self.funds_collection.update_one(
                {"_id": ObjectId(fund_id)},
                {"$set": {"summary": summary, "updated_at": datetime.datetime.utcnow()}}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating fund summary: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_fund_documents(self, fund_id):
        """Get all documents for a fund"""
        print(f"Inside get_fund_documents with fund_id: {fund_id}")
        if self.db is None:
            print("MongoDB not connected")
            return []
        
        try:
            docs = list(self.documents_collection.find({"fund_id": fund_id}))
            print(f"Found {len(docs)} documents for fund {fund_id}")
            return docs
        except Exception as e:
            print(f"Error getting fund documents: {e}")
            import traceback
            traceback.print_exc()
            return []

    def delete_fund(self, fund_id):
        """Delete a fund and all its associated documents"""
        print(f"Inside delete_fund method with id: {fund_id}")
        if self.db is None:
            print("MongoDB not connected")
            return False
        
        try:
            # Convert string ID to ObjectId
            object_id = ObjectId(fund_id)
            
            # First, delete all documents associated with this fund
            docs_result = self.documents_collection.delete_many({"fund_id": fund_id})
            print(f"Deleted {docs_result.deleted_count} documents for fund {fund_id}")
            
            # Then delete the fund itself
            fund_result = self.funds_collection.delete_one({"_id": object_id})
            
            success = fund_result.deleted_count > 0
            if success:
                print(f"Successfully deleted fund: {fund_id}")
            else:
                print(f"Fund {fund_id} not found or not deleted")
            
            return success
        except Exception as e:
            print(f"Error deleting fund: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_document(self, document_id: str):
        """Get a document by ID (either document_id or MongoDB _id)"""
        print(f"Inside get_document method with id: {document_id}")
        if self.db is None:
            print("MongoDB not connected")
            return None
        
        try:
            # First try to find by doc_id field (the UUID used in Pinecone)
            document = self.documents_collection.find_one({"doc_id": document_id})
            
            # If not found, try as MongoDB ObjectId
            if not document:
                try:
                    object_id = ObjectId(document_id)
                    document = self.documents_collection.find_one({"_id": object_id})
                except:
                    pass
            
            if document:
                print(f"Found document: {document}")
            else:
                print(f"No document found with ID: {document_id}")
                
            return document
        except Exception as e:
            print(f"Error getting document: {e}")
            import traceback
            traceback.print_exc()
            return None