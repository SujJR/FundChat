import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

import uvicorn
from app.config.settings import settings # type: ignore
from app.models.models import (
    QueryRequest, QueryResponse, 
    DocumentUploadResponse, 
    FundResponse, FundListResponse,
    ChatRequest, ChatResponse  # Added chat models
)
from app.services.document_processor import DocumentProcessor
from app.services.rag_service import RAGService

# Import from the fixed MongoDB service file
from app.services.mongodb_service_fixed import MongoDBService
from openai import OpenAI
import datetime

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin during development
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

document_processor = DocumentProcessor()
rag_service = RAGService(document_processor)
mongodb_service = MongoDBService()
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

@app.on_event("startup")
async def startup_db_client():
    """Check MongoDB connection on startup"""
    try:
        if mongodb_service.client:            
            mongodb_service.db.command('ping')
            print("Successfully connected to MongoDB Atlas!")
            print(f"Database: {settings.MONGODB_DB_NAME}")
            
            collections = mongodb_service.db.list_collection_names()
            if collections:
                print(f"   Collections: {', '.join(collections)}")
            else:
                print("   No collections found. They will be created automatically.")
        else:
            print("Failed to connect to MongoDB. Services requiring MongoDB may not work.")
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        print("   Services requiring MongoDB may not work properly.")

@app.get("/")
async def root():
    return {"message": "Welcome to FundChat API"}


@app.post("/api/upload", response_model=List[DocumentUploadResponse])
async def upload_document(
    files: List[UploadFile] = File(...),
    fund_name: str = Form(...)
):
    responses = []
    
    try:

        processed_documents = []
        for file in files:
            try:
                content = await file.read()
                file_path = document_processor.save_file(content, file.filename)
                
                file_extension = os.path.splitext(file.filename)[1].lower()
                
                if file_extension == '.pdf':
                    try:
                        import PyPDF2
                        with open(file_path, 'rb') as pdf_file:
                            pdf_reader = PyPDF2.PdfReader(pdf_file)
                            file_content = ""
                            for page_num in range(len(pdf_reader.pages)):
                                file_content += pdf_reader.pages[page_num].extract_text() + "\n"
                        processed_documents.append(file_content)
                    except ImportError:
                        processed_documents.append(f"[Content from PDF file {file.filename} - install PyPDF2 to extract text]")
                else:
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            file_content = f.read()
                            processed_documents.append(file_content)
                    except UnicodeDecodeError:
                        try:
                            with open(file_path, 'r', encoding='latin-1') as f:
                                file_content = f.read()
                                processed_documents.append(file_content)
                        except:
                            processed_documents.append(f"[Could not extract text from {file.filename}]")
                    
                responses.append(DocumentUploadResponse(
                    filename=file.filename,
                    status="success",
                    message="Document processed successfully"
                ))
            except Exception as e:
                responses.append(DocumentUploadResponse(
                    filename=file.filename,
                    status="error",
                    message=f"Error: {str(e)}"
                ))
        
        fund_summary = "No content available for summary"
        if processed_documents:
            try:
                # Combine content from all documents
                all_docs_content = "\n\n--- DOCUMENT SEPARATOR ---\n\n".join(processed_documents)
                
                # Calculate a reasonable character limit based on number of documents
                char_limit = min(4000 * 10, 40000 // max(1, len(processed_documents)))
                context = all_docs_content[:char_limit]
                
                # Try to generate a summary using OpenAI API
                try:
                    response = openai_client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                        {"role": "system", "content": "You are an assistant that creates concise fund summaries."},
                        {"role": "user", "content": f"Create a brief summary of this fund based on the following document(s) (limited to {len(processed_documents)} documents, first {char_limit // 1000}K chars):\n{context}"}
                        ],
                        max_tokens=800
                    )
                    fund_summary = response.choices[0].message.content.strip()
                    print(f"Generated summary using {len(processed_documents)} documents: {fund_summary}")
                except Exception as api_error:
                    print(f"Error with OpenAI API: {api_error}")
                    if "insufficient_quota" in str(api_error):
                        fund_summary = "No summary available - OpenAI API quota exceeded. You may need to update your billing information or use a different API key."
                    else:
                        fund_summary = f"Error generating summary: {str(api_error)[:100]}"
            except Exception as summary_e:
                print(f"Error generating summary: {summary_e}")
                fund_summary = "Error generating summary"
        fund_data = {
            "fund_name": fund_name,
            "summary": fund_summary
        }
        
        fund_id = mongodb_service.create_fund(fund_data)
        
        if not fund_id:
            raise HTTPException(status_code=500, detail="Failed to create fund in database")
        
        for idx, file in enumerate(files):
            try:
                await file.seek(0)
                content = await file.read()
                
                file_path = document_processor.save_file(content, file.filename)
                success = document_processor.process_file(file_path, fund_id)
                
                if not success:
                    responses[idx].status = "error"
                    responses[idx].message = "Failed to process document"
            except Exception as e:
                responses[idx].status = "error"
                responses[idx].message = f"Error: {str(e)}"
        
        for response in responses:
            response.fund_id = fund_id
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating fund: {str(e)}")
    
    return responses

@app.post("/api/query", response_model=QueryResponse, response_model_exclude={"sources"})
async def query(request: QueryRequest):
    try:
        answer, sources = rag_service.query(
            request.query, 
            request.fund_id,
            request.top_k,
            request.document_ids
        )
        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/funds", response_model=FundListResponse)
async def list_funds():
    """List all available funds"""
    try:
        funds_raw = mongodb_service.list_funds()
        funds_processed = []
        for fund in funds_raw:
            print(f"Processing fund: {fund['_id']}")
            fund_copy = fund.copy()
            # Rename _id to fund_id and convert ObjectId to string if needed
            if '_id' in fund_copy:
                fund_copy['fund_id'] = str(fund_copy['_id'])
                del fund_copy['_id']  # Remove the original _id field
            funds_processed.append(fund_copy)
        result = FundListResponse(funds=funds_processed)
        print(f"Funds processed: {result}")
        return result
    except Exception as e:
        print(f"Error listing funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/funds/{fund_id}", response_model=FundResponse)
async def get_fund(fund_id: str):
    """Get information about a specific fund, generating summary if needed"""
    try:
        fund = mongodb_service.get_fund(fund_id)
        if not fund:
            raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

        # Get documents associated with this fund
        documents = mongodb_service.get_fund_documents(fund_id)
        document_list = []
        
        for doc in documents:
            # Process document for response
            document_list.append({
                "document_id": str(doc.get("_id")),  # Add document_id field
                "file_name": doc.get("file_name", "Unknown"),
                "file_type": doc.get("file_type", "Unknown"),
                "created_at": doc.get("created_at", datetime.datetime.utcnow())
            })

        # Generate or update summary if needed
        if fund.get("summary") == "Empty" or (fund.get("document_count", 0) != len(document_list) and fund.get("document_count", 0) > 0):
            print(f"Generating summary for fund {fund_id} with {len(document_list)} documents...")
            try:
                # For multi-document funds, use a more comprehensive query
                if len(document_list) > 1:
                    summary_query = f"Create a comprehensive summary of this fund that covers all {len(document_list)} documents. Include key information from each document."
                else:
                    summary_query = "Provide a good summary of this fund based on the available document."
                
                generated_summary, _ = rag_service.query(summary_query, fund_id, top_k=10)  # Use higher top_k for better summary
                
                if generated_summary and generated_summary != "I don't have enough information to answer this question.":
                    update_success = mongodb_service.update_fund_summary(fund_id, generated_summary)
                    if update_success:
                        fund = mongodb_service.get_fund(fund_id)
                        if not fund:
                             raise HTTPException(status_code=500, detail="Failed to retrieve updated fund data after summary generation")
                    else:
                         print(f"Warning: Failed to update summary for fund {fund_id}")
                else:
                    print(f"Info: Could not generate summary for fund {fund_id}. Keeping original.")

            except Exception as summary_e:
                print(f"Error generating or updating summary for fund {fund_id}: {summary_e}")
                print(f"Detailed error: {str(summary_e)}")
                # Don't fail the whole request if summary generation fails

        # Convert MongoDB document format to match FundResponse model
        fund_copy = fund.copy()
        if '_id' in fund_copy:
            fund_copy['fund_id'] = str(fund_copy['_id'])
            del fund_copy['_id']  # Remove the original _id field
            
        # Update document count to match actual document count
        fund_copy['document_count'] = len(document_list)
        
        # Update the MongoDB document count if it doesn't match
        if fund.get("document_count", 0) != len(document_list):
            try:
                mongodb_service.funds_collection.update_one(
                    {"_id": fund.get("_id")},
                    {"$set": {"document_count": len(document_list)}}
                )
                print(f"Updated document count for fund {fund_id} to {len(document_list)}")
            except Exception as e:
                print(f"Error updating document count: {e}")
            
        # Add documents to the response
        fund_copy['documents'] = document_list

        return FundResponse(**fund_copy)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/funds/{fund_id}/chat", response_model=ChatResponse)
async def chat_with_fund(fund_id: str, request: ChatRequest):
    """Chat with the documents associated with a specific fund"""
    try:
        # Check if fund exists and get document count
        fund = mongodb_service.get_fund(fund_id)
        if not fund:
            raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

        # Get the document count
        documents = mongodb_service.get_fund_documents(fund_id)
        doc_count = len(documents)
        
        # Adjust top_k based on document count and query complexity
        adjusted_top_k = request.top_k
        
        # For funds with multiple documents, we may need to increase top_k
        if doc_count > 1 and not request.document_ids:
            # For general queries, increase top_k to ensure we get context from multiple documents
            adjusted_top_k = max(request.top_k, min(15, 5 * doc_count))
            print(f"Adjusted top_k from {request.top_k} to {adjusted_top_k} for multi-document fund")

        answer, sources = rag_service.query(
            query=request.message, 
            fund_id=fund_id,
            top_k=adjusted_top_k,
            document_ids=request.document_ids
        )
        
        # Enhance answer with document reference if there are multiple documents
        if doc_count > 1 and sources:
            # Check if we have sources from multiple documents
            doc_names = set(s.get('file_name', '') for s in sources if 'file_name' in s)
            
            if len(doc_names) > 1:
                # Add a note about which documents were referenced
                doc_list = ", ".join([f"'{name}'" for name in doc_names])
                reference_note = f"\n\nThis answer references information from multiple documents: {doc_list}."
                
                # Only add if the answer doesn't already contain this information
                if "references information from" not in answer:
                    answer += reference_note
        
        return ChatResponse(answer=answer, sources=sources)
    except HTTPException:
        # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        print(f"Error during chat for fund {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during chat: {str(e)}")

@app.delete("/api/funds/{fund_id}")
async def delete_fund(fund_id: str):
    """Delete a fund and all associated documents"""
    try:
        # Check if fund exists
        fund = mongodb_service.get_fund(fund_id)
        if not fund:
            raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")
        
        # Delete the fund and its documents
        success = mongodb_service.delete_fund(fund_id)
        
        if success:
            return {"status": "success", "message": f"Fund {fund_id} deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete fund")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting fund {fund_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/api/mongodb/status")
async def mongodb_status():
    """Check MongoDB connection status"""
    try:
        if mongodb_service.client:
            mongodb_service.db.command('ping')
            collections = mongodb_service.db.list_collection_names()
            return {
                "status": "connected",
                "database": settings.MONGODB_DB_NAME,
                "collections": collections
            }
        else:
            return {
                "status": "disconnected",
                "message": "MongoDB client not initialized"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/api/documents/{document_id}")
async def get_document(document_id: str):
    """Get a document's content by ID"""
    try:
        # Check if document exists
        document = mongodb_service.get_document(document_id)
        if not document:
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
        
        # Get file path from document data
        file_name = document.get("file_name", "unknown")
        print(f"Looking for document: {file_name} for document_id: {document_id}")
        
        # Search for the file in documents directory
        documents_path = settings.DOCUMENTS_PATH
        file_path = None
        
        # The document may have been saved with a UUID in the filename
        base_name, extension = os.path.splitext(file_name)
        print(f"Searching for files matching base_name: {base_name} with extension: {extension}")
        
        # List all files in the documents directory
        all_files = os.listdir(documents_path)
        for f in all_files:
            # Use more flexible matching to find the file with UUID
            if f.startswith(base_name) and f.endswith(extension):
                file_path = os.path.join(documents_path, f)
                print(f"Found matching file: {f}")
                break
        
        if not file_path or not os.path.exists(file_path):
            print(f"Error: Could not find file for {file_name}. Available files: {', '.join(all_files[:5])}")
            raise HTTPException(status_code=404, detail=f"Document file {file_name} not found")
        
        # Read file content
        file_extension = os.path.splitext(file_path)[1].lower()
        
        # For PDF files, extract text
        if file_extension == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    file_content = ""
                    for page_num in range(len(pdf_reader.pages)):
                        file_content += pdf_reader.pages[page_num].extract_text() + "\n"
                        
                return {"document_id": document_id, "file_name": file_name, "content": file_content}
            except ImportError:
                return {"document_id": document_id, "file_name": file_name, "content": "PDF viewing requires PyPDF2 library"}
            except Exception as e:
                return {"document_id": document_id, "file_name": file_name, "content": f"Error reading PDF: {str(e)}"}
        else:
            # For text files
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                return {"document_id": document_id, "file_name": file_name, "content": file_content}
            except UnicodeDecodeError:
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        file_content = f.read()
                    return {"document_id": document_id, "file_name": file_name, "content": file_content}
                except Exception as e:
                    return {"document_id": document_id, "file_name": file_name, "content": f"Error reading file: {str(e)}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/upload")
async def upload_chat_attachment(file: UploadFile = File(...)):
    """Upload a file attachment for general chat"""
    try:
        # Read file content
        content = await file.read()
        
        # Save the file temporarily
        file_path = document_processor.save_file(content, file.filename)
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        # Extract text from file
        file_content = ""
        if file_extension == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page_num in range(len(pdf_reader.pages)):
                        file_content += pdf_reader.pages[page_num].extract_text() + "\n"
            except Exception as e:
                file_content = f"[Could not extract PDF content: {str(e)}]"
        else:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            except UnicodeDecodeError:
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        file_content = f.read()
                except Exception as e:
                    file_content = f"[Could not extract text content: {str(e)}]"
        
        # Return the file info and content
        return {
            "filename": file.filename,
            "file_type": file_extension.replace(".", ""),
            "content": file_content[:2000] + "..." if len(file_content) > 2000 else file_content,
            "full_path": file_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/api/funds/{fund_id}/chat/upload")
async def upload_fund_chat_attachment(fund_id: str, file: UploadFile = File(...)):
    """Upload a file attachment for fund-specific chat"""
    try:
        # Check if fund exists
        fund = mongodb_service.get_fund(fund_id)
        if not fund:
            raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")
        
        # Read file content
        content = await file.read()
        
        # Save the file
        file_path = document_processor.save_file(content, file.filename)
        
        # Process the file and add to vector store
        success = document_processor.process_file(file_path, fund_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to process document")
        
        # Get the documents for this fund to find the newly added one
        documents = mongodb_service.get_fund_documents(fund_id)
        latest_doc = None
        
        if documents:
            # Find the document with the matching filename (with UUID)
            base_name, extension = os.path.splitext(file.filename)
            for doc in documents:
                doc_filename = doc.get("file_name", "")
                if doc_filename.startswith(f"{base_name}_") and doc_filename.endswith(extension):
                    latest_doc = doc
                    break
                    
            # If not found, just use the latest document
            if not latest_doc and documents:
                # Sort by creation time and get the latest
                sorted_docs = sorted(documents, key=lambda x: x.get("created_at", 0), reverse=True)
                latest_doc = sorted_docs[0]
        
        if latest_doc:
            return {
                "filename": file.filename,
                "file_type": os.path.splitext(file.filename)[1].replace(".", ""),
                "document_id": latest_doc.get("doc_id", ""),
                "message": "Document processed and added to fund chat"
            }
        else:
            return {
                "filename": file.filename,
                "file_type": os.path.splitext(file.filename)[1].replace(".", ""),
                "message": "Document processed but metadata not found"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
