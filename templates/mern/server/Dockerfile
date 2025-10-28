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
EXPOSE 5000

# Set environment variables (can be overridden)
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]
