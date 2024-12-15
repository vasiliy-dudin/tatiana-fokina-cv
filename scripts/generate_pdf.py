from weasyprint import HTML

HTML("../docs/index.html").write_pdf(
    "../docs/cv.pdf",
    pdf_version="1.7",
    uncompressed=True,
    pdf_variant="pdf/ua-1",
    full_fonts=True
)

print("PDF successfully created: resume.pdf")
