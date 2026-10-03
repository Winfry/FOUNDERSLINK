import os
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from chunking import chunk_documents
from dotenv import load_dotenv

load_dotenv()

# Configuration
DOCS_DIR = ""
DB_DIR = ""

def ingest_compliance_data():
    print(f"Loading compliance documents from {DOCS_DIR}...")
    loader = PyPDFDirectoryLoader(DOCS_DIR)
    documents = loader.load()

    if not documents:
        print("No documents found. Please add PDFs to the directory.")

    chunked_docs = chunk_documents(documents)

    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

    # Create vector store
    vector_store = Chroma.from_documents(
        documents=chunked_docs,
        embedding=embeddings,
        persist_directory=DB_DIR
    )

if __name__ == "__main__":
    ingest_compliance_data()