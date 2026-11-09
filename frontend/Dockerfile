FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ENV API_URL=http://localhost:8080
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
CMD ["sh", "-c", "echo \"window.__CONFIG__ = { API_URL: '$API_URL' };\" > /usr/share/nginx/html/config.js && exec nginx -g 'daemon off;'"]