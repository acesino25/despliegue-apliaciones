¿Cómo trabajar con el Dockerfile en local?

Habiendo instalado las dependencias necesarias, en consola correremos los siguientes comandos:

1) docker build -t app:v1 (esto parados en el directorio del proyecto)
2) docker images    (Con esto listamos las imágenes existentes)
3) docker run -d -p 3000:3000 --name app-nombre app:v1 
[-d] lo corre en segundo plano *(detached)*
[-p] conecta el puerto 3000 de la PC hacia el 3000 del contenedor.
[--name] creamos una etiqueta para referenciar a app:v1, de forma que sea más amigable al leer.

¿Cómo destruyo el contenedor?

Ejecutando el siguiente comando:
docker rm -f app-nombre
(Usamos el nombre creado como etiqueta)
[-f] para forzar la detención.