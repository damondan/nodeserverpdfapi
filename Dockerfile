# Use official Node.js image as base
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install pnpm first
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json /app/
COPY pnpm-lock.yaml /app/

# Install dependencies with pnpm
RUN pnpm install

# Copy the application code
COPY *.js /app/

# Copy the PDF folders
COPY Codoh/ /app/Codoh/
COPY Jung/ /app/Jung/
COPY ProgramLanguages/ /app/ProgramLanguages/

# Expose port for the API
EXPOSE 3001

# Start the Node.js server
CMD ["node", "server.js"]
