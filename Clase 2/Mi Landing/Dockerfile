# HTML y Js no necesitan en este caso compiladores, por lo que serviremos los archivos estáticamente con nginx
FROM nginx:alpine
COPY ./public_html /usr/share/nginx/html
EXPOSE 80

#Ejecutamos nginx de fondo
CMD ["nginx", "-g", "daemon off;"]