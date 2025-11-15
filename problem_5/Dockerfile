FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies (skip optional deps like better-sqlite3)
RUN npm ci --omit=optional

COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
