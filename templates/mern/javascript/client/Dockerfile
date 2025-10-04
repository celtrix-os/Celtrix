# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# The client app runs on port 3000, so we expose that
EXPOSE 3000

# Define the command to run the application
CMD [ "npm", "run", "dev" ]