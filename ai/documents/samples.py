# Builds clearly fake sample documents for tests and the demo. Every
# sample says it is not a real certificate. Never use real people's or
# businesses' details here.

DEMO_STAMP = "DEMO DOCUMENT - NOT ISSUED BY ANY GOVERNMENT OFFICE - FOR FOUNDERLINK TESTING ONLY"


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines: list[str], producer: str = "FounderLink sample generator") -> bytes:
    """A one-page PDF with a real text layer, so it reads like a certificate
    downloaded from an online portal."""
    body = "BT /F1 11 Tf 50 800 Td 16 TL " + " ".join(f"({_escape(l)}) Tj T*" for l in lines) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(body)} >>\nstream\n{body}\nendstream",
        f"<< /Producer ({_escape(producer)}) /CreationDate (D:20260101120000) >>",
    ]
    out = "%PDF-1.4\n"
    offsets = []
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(out.encode("latin-1")))
        out += f"{number} 0 obj\n{obj}\nendobj\n"
    xref = len(out.encode("latin-1"))
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")


def business_registration(name: str = "Afya Booking Ltd", number: str = "PVT-DEMO1234",
                          dated: str = "12/03/2025", producer: str = "FounderLink sample generator") -> bytes:
    return make_pdf([
        DEMO_STAMP,
        "REPUBLIC OF KENYA",
        "THE COMPANIES ACT, 2015",
        "CERTIFICATE OF INCORPORATION",
        f"Company Name: {name}",
        f"Registration Number: {number}",
        f"Date of incorporation: {dated}",
        "Issued by the Registrar of Companies",
        DEMO_STAMP,
    ], producer)


def kra_pin_certificate(name: str = "Afya Booking Ltd", pin: str = "P051234567X",
                        dated: str = "15/03/2025", producer: str = "FounderLink sample generator") -> bytes:
    return make_pdf([
        DEMO_STAMP,
        "KENYA REVENUE AUTHORITY",
        "PIN CERTIFICATE",
        "Personal Identification Number (PIN) Certificate",
        f"Taxpayer Name: {name}",
        f"Personal Identification Number: {pin}",
        f"Certificate Date: {dated}",
        DEMO_STAMP,
    ], producer)
