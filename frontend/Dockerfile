# --- Stage 1: Build ---
    FROM node:20 AS builder
    WORKDIR /app
    COPY . .
    RUN npm install
    RUN npm run build
    
    # --- Stage 2: Serve with NGINX ---
    FROM nginx:alpine
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # Replace default NGINX config (optional, if needed)
    # COPY nginx.conf /etc/nginx/nginx.conf
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    