FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Then copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p storage/json storage/pdfs/question_papers storage/pdfs/answer_sheets storage/jsons/annotations

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
