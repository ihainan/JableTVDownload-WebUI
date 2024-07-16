FROM node:lts AS build-stage

# make the 'app' folder the current working directory
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# set up Nginx
FROM nginx:latest AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]