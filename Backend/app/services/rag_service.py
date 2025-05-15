from typing import List, Dict, Tuple, Any

from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

from app.config.settings import settings
from app.services.document_processor import DocumentProcessor

class RAGService:
    def __init__(self, document_processor: DocumentProcessor):
        self.document_processor = document_processor
        self.llm = ChatOpenAI(
            model_name="gpt-4o",
            temperature=0.4,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Enhanced prompt to better handle multiple documents
        self.qa_prompt = PromptTemplate(
            template="""You are a helpful assistant that answers questions based on the provided context from multiple documents.

The context below may contain content from several different documents related to the same fund.

Context: {context}

Using ONLY the information in the context above, answer the following question thoroughly and accurately. 
If information is found in multiple documents, synthesize it into a comprehensive answer.
If the information isn't in the context, say "I don't have enough information to answer this question."

            Question: {question}
            """,
            input_variables=["context", "question"]
        )
    
    def query(self, query: str, fund_id: str, top_k: int = 5, document_ids: List[str] = None) -> Tuple[str, List[Dict]]:
        """
        Process a query using RAG for a specific fund and return the answer with sources
        
        Args:
            query: The query string
            fund_id: The fund ID to search in
            top_k: Number of chunks to retrieve
            document_ids: Optional list of document IDs to filter by
        """
        print(f"Querying for fund_id: {fund_id} with query: '{query}' and top_k: {top_k}")
        if document_ids:
            print(f"Filtering by document IDs: {document_ids}")
        
        # Adjust top_k based on query complexity
        # For broad queries like summaries, we need more context
        if any(keyword in query.lower() for keyword in ['summarize', 'summary', 'overview', 'describe', 'what is']):
            adjusted_top_k = max(top_k, 10)
            print(f"Adjusted top_k to {adjusted_top_k} for broad query")
        else:
            adjusted_top_k = top_k
        
        # Create filter based on fund_id and optional document_ids
        filter_dict = {"fund_id": fund_id}
        if document_ids:
            filter_dict["doc_id"] = {"$in": document_ids}
        
        # Print all chunks that match this fund_id first for debugging
        print(f"--- All chunks for fund_id: {fund_id} ---")
        all_fund_docs = self.document_processor.vectordb.similarity_search(
            query="",
            k=100,  # Get a larger number to see all chunks
            filter=filter_dict
        )
        print(f"Total chunks for fund_id {fund_id}: {len(all_fund_docs)}")
        for i, doc in enumerate(all_fund_docs):
            print(f"Fund chunk {i+1}:")
            print(f"  Metadata: {doc.metadata}")
            print(f"  Content preview: {doc.page_content[:100]}...")
            print("-" * 40)
        print("--- End of all fund chunks ---\n")
        
        # Create retriever with adjusted top_k
        retriever = self.document_processor.vectordb.as_retriever(
            search_kwargs={
                "k": adjusted_top_k,
                "filter": filter_dict
            }
        )
        
        print(f"DEBUG: Retriever config: {retriever.search_kwargs}")
        docs = retriever.get_relevant_documents(query)
        
        # --- Debug Print Start ---
        print(f"--- Retrieved {len(docs)} chunks for query: '{query}' ---")
        for i, doc in enumerate(docs):
            print(f"Chunk {i+1}:")
            print(f"  Metadata: {doc.metadata}")
            print(f"  Content: {doc.page_content[:200]}...") # Print first 200 chars
            print("-" * 20)
        print("--- End Retrieved Chunks ---")
        # --- Debug Print End ---
        
        sources = [doc.metadata for doc in docs]
        print(f"DEBUG: Sources count: {len(sources)}")
        
        for source in sources:
            if source.get('type') == 'image' and 'image_path' in source:
                image_data = self.document_processor.get_image_data(source['image_path'])
                print(f"DEBUG: Found image source at {source['image_path']}, data available: {image_data is not None}")
                if image_data:
                    source['image_base64'] = image_data
        
        # Organize documents by source for better context formation
        docs_by_source = {}
        for doc in docs:
            source_name = doc.metadata.get("file_name", "Unknown")
            if source_name not in docs_by_source:
                docs_by_source[source_name] = []
            docs_by_source[source_name].append(doc)
        
        # Create a better formatted context with clear document separation
        formatted_docs = []
        for source_name, source_docs in docs_by_source.items():
            # Add a header for each document source
            formatted_docs.append(f"\n--- DOCUMENT: {source_name} ---\n")
            
            for doc in source_docs:
                doc_type = doc.metadata.get("type", "text")
                page = doc.metadata.get("page_number", "Unknown page")
                chunk = doc.metadata.get("chunk", "Unknown chunk")
            
            if doc_type == "table":
                    formatted_docs.append(f"[TABLE from page {page}, chunk {chunk}]:\n{doc.page_content}")
            elif doc_type == "image":
                    formatted_docs.append(f"[IMAGE from page {page}, chunk {chunk}]")
            else:
                    formatted_docs.append(f"[CONTENT from page {page}, chunk {chunk}]:\n{doc.page_content}")
        
        context = "\n\n".join(formatted_docs)
        print(f"DEBUG: Formatted context length: {len(context)} chars")
        print(f"DEBUG: Context preview: {context[:500]}...")
        
        chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={"prompt": self.qa_prompt}
        )
        
        print("DEBUG: Invoking LLM chain...")
        answer = chain.invoke(query)
        print(f"DEBUG: Answer received, length: {len(answer['result'])} chars")
        print(f"DEBUG: Answer preview: {answer['result'][:200]}...")
        
        # Return answer and deduplicated sources
        # Use a dictionary for deduplication since metadata dictionaries aren't hashable
        unique_sources = []
        source_paths = set()
        for source in sources:
            source_id = f"{source.get('file_name', '')}-{source.get('page_number', '')}-{source.get('type', '')}"
            if source_id not in source_paths:
                source_paths.add(source_id)
                unique_sources.append(source)
        
        print(f"DEBUG: Unique sources count: {len(unique_sources)} out of {len(sources)}")
        
        return answer["result"], unique_sources