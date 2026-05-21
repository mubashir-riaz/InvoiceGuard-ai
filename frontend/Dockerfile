# Development image for React Vite frontend.
# Used by docker-compose to run the Vite dev server with hot module replacement.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Vite dev server binds to 0.0.0.0 so it can be reached from outside the container.
CMD ["npm", "run", "dev", "--", "--host"]