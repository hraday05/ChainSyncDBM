FROM node:18-alpine

WORKDIR /app

# Copy the backend package.json files
COPY backend/package*.json ./backend/

# Install dependencies in the backend folder
RUN cd backend && npm ci --only=production

# Copy the entire project (backend + frontend)
COPY . .

# Setting Node environment to production
ENV NODE_ENV=production

EXPOSE 5050

# Run the API server from the backend folder
WORKDIR /app/backend
CMD ["node", "server.js"]
