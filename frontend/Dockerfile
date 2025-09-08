# frontend/Dockerfile
FROM node:22-slim

ENV NODE_ENV=development
WORKDIR /app

# Build deps for native modules (sharp, etc.)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Use Corepack to get a reliable pnpm
RUN corepack enable
# (Optional) pin a pnpm version; remove if you prefer latest
RUN corepack prepare pnpm@9.12.0 --activate || true

# Install deps first for layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy config files that affect CSS build (kept separate so edits bust cache correctly)
COPY postcss.config.* tailwind.config.* tsconfig.* next.config.* ./

# Now copy the rest of the app
COPY . .

EXPOSE 3000
CMD ["pnpm", "dev"]
