from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field
from playwright.sync_api import sync_playwright

from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

PAGE_FORMATS = {"A3", "A4", "A5", "Letter", "Legal", "Tabloid"}


class PdfRequest(BaseModel):
    html: str
    page_size: str = "A4"
    orientation: str = "portrait"
    filename: str = Field(default="report.pdf")


def render_pdf_bytes(html: str, page_size: str, orientation: str) -> bytes:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            return page.pdf(
                format=page_size if page_size in PAGE_FORMATS else "A4",
                landscape=orientation == "landscape",
                print_background=True,
            )
        finally:
            browser.close()


@router.post("/pdf")
async def render_report_pdf(body: PdfRequest, _user=Depends(get_current_user)):
    pdf = await run_in_threadpool(render_pdf_bytes, body.html, body.page_size, body.orientation)
    filename = body.filename if body.filename.lower().endswith(".pdf") else f"{body.filename}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
