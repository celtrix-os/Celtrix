# Use Node.js LTS version as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 8787

# Set environment variables
ENV NODE_ENV=production

# Start the application with Wrangler
CMD ["npm", "run", "dev"]