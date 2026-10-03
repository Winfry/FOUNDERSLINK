# compliance/answer.py
import sys
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from retrieve import get_retriever
from rules_engine import analyze_query_intent, apply_legal_guardrails, validate_access
from dotenv import load_dotenv

load_dotenv()

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def generate_compliance_answer(query: str, user_role: str = "founder") -> str:
    # 1. Rules Engine: Pre-retrieval validation
    if not validate_access(user_role, query):
        return "Access Denied: Your current role does not permit querying this specific internal information."
    
    # 2. Rules Engine: Identify domain filters (optional)
    filters = analyze_query_intent(query)
    
    # 3. Retrieval
    retriever = get_retriever(k_chunks=5, filters=filters)
    
    # 4. Construct Prompt
    template = """You are an expert legal and compliance assistant specializing in Republic of Kenya corporate law.
    Answer the user's question clearly and professionally based ONLY on the provided context. 
    If the context does not contain the answer, explicitly state: "I cannot find specific guidance on this in the loaded Kenyan compliance documents." Do not guess.

    Context:
    {context}

    Question: {question}

    Answer:"""
    
    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatOpenAI(model="gpt-4-turbo", temperature=0) # Temp 0 minimizes hallucinations on legal docs
    
    # 5. Build and execute LangChain chain
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    try:
        raw_answer = rag_chain.invoke(query)
    except Exception as e:
        return f"Error generating answer: {str(e)}"
    
    # 6. Rules Engine: Post-generation guardrails
    final_answer = apply_legal_guardrails(raw_answer)
    
    return final_answer

# Command line testing
if __name__ == "__main__":
    test_query = "What are the data localization requirements for fintech companies in Kenya?"
    print(generate_compliance_answer(test_query, user_role="founder"))