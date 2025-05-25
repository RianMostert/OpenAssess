from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse
import fitz
import json
import tempfile
import shutil
import os

router = APIRouter(prefix="/annotations", tags=["Annotations"])

# def hex_to_rgb(hex_color):
#     hex_color = hex_color.lstrip("#")
#     return tuple(int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4))
NAMED_COLORS = {
    "black": "#000000",
    "white": "#ffffff",
    "red": "#ff0000",
    "green": "#00ff00",
    "blue": "#0000ff",
    "yellow": "#ffff00",
    "cyan": "#00ffff",
    "magenta": "#ff00ff",
}

def hex_to_rgb(color):
    if not color.startswith("#"):
        color = NAMED_COLORS.get(color.lower(), "#000000")  # default to black
    color = color.lstrip("#")
    return tuple(int(color[i:i+2], 16)/255 for i in (0, 2, 4))

def flip_y(y, page_height):
    # return page_height - y
    return y

def adjust_x(x, page_width):
    return x

def burn_annotations(pdf_path, output_path, annotation_json):
    doc = fitz.open(pdf_path)
    data = json.loads(annotation_json)
    # page = doc[data["page"] - 1]
    page = doc[0]  # Assuming we always work with the first page
    page_height = page.rect.height
    page_width = page.rect.width

    for line in data.get("lines", []):
        points = line["points"]
        stroke = hex_to_rgb(line["stroke"])
        stroke_width = line["strokeWidth"]
        for i in range(0, len(points) - 2, 2):
            p1 = fitz.Point(adjust_x(points[i], page_width), flip_y(points[i + 1], page_height))
            p2 = fitz.Point(adjust_x(points[i + 2], page_width), flip_y(points[i + 3], page_height))
            page.draw_line(p1, p2, color=stroke, width=stroke_width)
            page.draw_circle(p1, stroke_width / 4, color=stroke)

    canvas_width = 779
    print(f"Page width: {page.rect.width}, Canvas width: {canvas_width}")

    for text in data.get("texts", []):
        x = text["x"]
        y = text["y"]  # if this aligns well, no need to touch
        width = 200
        height = 1000

        # p1 = fitz.Point(x,y)
        # page.draw_circle(p1, 5, color=(0, 0, 0))  # Draw a circle at the text position for debugging

        rect = fitz.Rect(x, y, x + width, y + height)
        color = hex_to_rgb(text["fill"])
        font_size = text["fontSize"]
        content = text["text"]

        page.insert_textbox(
            rect,
            content,
            fontsize=font_size,
            color=color,
            align=0,
        )

    for sticky in data.get("stickyNotes", []):
        x = adjust_x(sticky["x"], page_width)
        y = flip_y(sticky["y"], page_height)
        content = sticky["text"]
        page.add_text_annot(fitz.Point(x, y), content)

    doc.save(output_path)

@router.post("/burn")
async def burn_annotations_endpoint(
    pdf: UploadFile = File(...),
    annotation_json: str = Form(...)
):
    # Save uploaded PDF to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        shutil.copyfileobj(pdf.file, tmp_pdf)
        input_pdf_path = tmp_pdf.name

    # Create temp output path
    output_pdf_path = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf").name

    try:
        burn_annotations(input_pdf_path, output_pdf_path, annotation_json)
        return FileResponse(output_pdf_path, filename="annotated.pdf", media_type="application/pdf")
    finally:
        os.remove(input_pdf_path)
