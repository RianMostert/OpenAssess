# https://pymupdf.readthedocs.io/en/latest/recipes-annotations.html

import pymupdf
import json

red = (1, 0, 0)
blue = (0, 0, 1)
gold = (1, 1, 0)
green = (0, 1, 0)

displ = pymupdf.Rect(0, 50, 0, 50)
r = pymupdf.Rect(72, 72, 220, 100)

doc = pymupdf.open("algos-assignment-02.pdf")
page = doc.new_page()

doc.delete_page(5)  # delete the first page

# page.set_rotation(0)

# Add text box anotation
r = r + displ
annot = page.add_freetext_annot(
    r,
    "this is my free text box",
    fontsize=10,
    rotate=90,
    text_color=blue,
    fill_color=gold,
    align=pymupdf.TEXT_ALIGN_CENTER,
)
annot.set_border(width=0.3, dashes=[2])
annot.update(text_color=blue, fill_color=gold)

# add stickynote annotation
r = annot.rect + displ
annot = page.add_text_annot(r.tl, "this is my sticky note with some words of wisdom")

doc.save(__file__.replace(".py", "-%i.pdf" % page.rotation), deflate=True)

