from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

DB_DIR = "./chroma_db"

def get_retriever(k_chunks=5, filters=None):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
    db = Chroma(persist_directory=DB_DIR, embedding_function=embeddings)
    
    search_kwargs = {"k": k_chunks}
    if filters:
        search_kwargs["filter"] = filters
        
    return db.as_retriever(search_kwargs=search_kwargs)

def retrieve_context(query: str, k=5, filters=None):
    retriever = get_retriever(k_chunks=k, filters=filters)
    docs = retriever.invoke(query)
    return docs