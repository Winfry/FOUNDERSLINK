# Writes clearly fake sample certificates for demos and manual testing.
# Run from the repository root:  python -m scripts.make_demo_documents
#
# Every file is stamped "DEMO DOCUMENT - NOT ISSUED BY ANY GOVERNMENT OFFICE".

from pathlib import Path

from ai.documents import samples

OUT = Path("data/demo-documents")

DOCUMENTS = {
    # Pass every pre-check for a founder whose business is "Afya Booking Ltd".
    "afya_business_registration.pdf": samples.business_registration(),
    "afya_kra_pin_certificate.pdf": samples.kra_pin_certificate(),
    # Show the AI flagging problems for the admin.
    "flagged_wrong_name_kra_pin.pdf": samples.kra_pin_certificate(name="Mavuno Traders"),
    "flagged_edited_kra_pin.pdf": samples.kra_pin_certificate(producer="iLovePDF"),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in DOCUMENTS.items():
        (OUT / name).write_bytes(data)
        print(f"wrote {OUT / name}")
