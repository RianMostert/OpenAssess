# https://pymupdf.readthedocs.io/en/latest/recipes-annotations.html

import fitz  # PyMuPDF
import json

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4))

def flip_y(y, page_height):
    return page_height - y

def burn_annotations(pdf_path, output_path, annotation_json):
    # Load PDF
    doc = fitz.open(pdf_path)

    data = json.loads(annotation_json)
    page = doc[data["pageNumber"] - 1]
    page_height = page.rect.height

    # Draw freehand lines (burned in)
    for line in data.get("lines", []):
        points = line["points"]
        stroke = hex_to_rgb(line["stroke"])
        stroke_width = line["strokeWidth"]

        for i in range(0, len(points) - 2, 2):
            p1 = fitz.Point(points[i], flip_y(points[i + 1], page_height))
            p2 = fitz.Point(points[i + 2], flip_y(points[i + 3], page_height))
            page.draw_line(p1, p2, color=stroke, width=stroke_width)
            page.draw_circle(p1, stroke_width / 4, color=stroke)

    # Burn in text annotations
    for text in data.get("textAnnotations", []):
        pos = fitz.Point(text["x"], flip_y(text["y"], page_height))
        color = hex_to_rgb(text["fill"])
        font_size = text["fontSize"]
        content = text["text"]
        page.insert_text(pos, content, fontsize=font_size, color=color)

    # Add sticky notes (not burned in)
    for sticky in data.get("stickyNotes", []):
        x = sticky["x"]
        y = flip_y(sticky["y"], page_height)
        content = sticky["text"]
        page.add_text_annot(fitz.Point(x, y), content)

    doc.save(output_path)


with open("annotations_page_1-4.json") as f:
    annotation_json = f.read()

burn_annotations("input.pdf", "output.pdf", annotation_json)
