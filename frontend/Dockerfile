FROM node:20-bullseye

# Use the exact version you're using locally if you know it's stable
RUN npm install -g pnpm

WORKDIR /app

# Copy only package files first for caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Now copy the rest of your app
COPY . .

# Expose the default Next.js port (optional but good practice)
EXPOSE 3000

# Start the development server
CMD ["pnpm", "dev"]