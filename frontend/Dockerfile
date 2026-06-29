# Stage 1: Build the React application
FROM node:18-alpine AS build

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

# Copy dependency configs and lockfiles
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Vite production bundle
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy built static assets from Stage 1 to Nginx HTML folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if routing requires it
# (Ensures React Router handles client-side paths correctly)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
