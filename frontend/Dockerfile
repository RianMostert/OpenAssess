FROM node:22-slim

# Install pnpm and build dependencies
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only package files first for caching
COPY package.json pnpm-lock.yaml ./

# Clean install
RUN pnpm install

# Now copy the rest of your app
COPY . .

# Expose the default Next.js port
EXPOSE 3000

# Start the development server
CMD ["pnpm", "dev"]