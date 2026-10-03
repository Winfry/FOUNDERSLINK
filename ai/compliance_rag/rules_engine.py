def analyze_query_intent(query: str) -> dict:
    query_lower = query.lower()
    filters = {}
    
    if any(keyword in query_lower for keyword in ["tax", "kra", "pin", "vat"]):
        filters["regulator"] = "KRA"
    elif any(keyword in query_lower for keyword in ["data", "privacy", "odpc"]):
        filters["regulator"] = "ODPC"
    elif any(keyword in query_lower for keyword in ["incorporate", "shares", "brs"]):
        filters["regulator"] = "BRS"
        
    return filters if filters else None

def validate_access(user_role: str, query: str) -> bool:
    sensitive_internal_terms = ["cap table", "employee salaries", "board disputes"]
    if user_role == "investor" and any(term in query.lower() for term in sensitive_internal_terms):
        return False
    return True

def apply_legal_guardrails(response: str) -> str:
    disclaimer = (
        "\n\n---\n"
        "**Legal Disclaimer:** This guidance is generated based on Republic of Kenya "
        "compliance frameworks (e.g., Companies Act 2015, Data Protection Act 2019). "
        "It is for informational purposes only and does not constitute formal legal or tax counsel. "
        "Please consult a certified Kenyan advocate or tax professional for definitive advice."
    )
    return response + disclaimer