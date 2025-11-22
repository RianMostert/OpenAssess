# ==================================================
# Stage 1: Build Frontend (Next.js)
# ==================================================
FROM node:22-slim AS frontend-builder

WORKDIR /build/frontend

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY frontend/ ./

# Accept build-time environment variables for Next.js config
# These will be baked into the build at build time
ARG NEXT_PUBLIC_BACKEND_HOST=localhost
ARG NEXT_PUBLIC_BACKEND_PORT=8000
ARG NEXT_PUBLIC_ALLOWED_ORIGINS=localhost:3000,127.0.0.1:3000,*.local:3000

ENV NEXT_PUBLIC_BACKEND_HOST=${NEXT_PUBLIC_BACKEND_HOST}
ENV NEXT_PUBLIC_BACKEND_PORT=${NEXT_PUBLIC_BACKEND_PORT}
ENV NEXT_PUBLIC_ALLOWED_ORIGINS=${NEXT_PUBLIC_ALLOWED_ORIGINS}

# Build Next.js app (creates standalone output in .next/standalone)
RUN pnpm run build

# ==================================================
# Stage 2: Build Backend Dependencies
# ==================================================
FROM python:3.12-slim AS backend-builder

WORKDIR /build/backend

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# ==================================================
# Stage 3: Final Runtime Image (No Nginx!)
# ==================================================
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies (Node.js for Next.js standalone + curl for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/nodesource.list

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser

# Copy Python dependencies from builder
COPY --from=backend-builder /root/.local /home/appuser/.local

# Copy backend application
COPY backend/ /app/backend/

# Create frontend directory and copy Next.js standalone build
RUN mkdir -p /app/frontend
COPY --from=frontend-builder /build/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /build/frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /build/frontend/public /app/frontend/public

# Create storage directories
RUN mkdir -p /app/backend/storage/pdfs/question_papers \
             /app/backend/storage/pdfs/answer_sheets \
             /app/backend/storage/jsons/annotations \
             /app/backend/storage/jsons/submissions

# Copy simplified entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set ownership
RUN chown -R appuser:appuser /app

# Set environment variables
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app/backend \
    NODE_ENV=production \
    PORT=3000

# Switch to non-root user
USER appuser

# Expose port 3000 (Next.js serves everything, proxies /api/* to backend)
EXPOSE 3000

# Health check - check Next.js server
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use entrypoint script to run migrations and start both services
ENTRYPOINT ["/entrypoint.sh"]
