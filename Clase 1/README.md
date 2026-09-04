# Contenerizacion

## Imágenes
Es el empaquetado de la aplicación funcional. Con sus dependencias, módulos, etc.
Usamos la palabra "imagen" porque es un algo **estático**.

## Contenedor
Entonces, no corremos la aplicación, sino, la imagen que contiene a la aplicación. Y para ello usamos contenedores, de forma que aislamos el entorno en el que funcionan.


## ¿Cómo trabajar con el Dockerfile en local?

Habiendo instalado las dependencias necesarias, en consola correremos los siguientes comandos:

1) ``docker build -t app:v1 .`` (**-t** es para darle un nombre a la imagen. Esto parados en el directorio del proyecto)
2) ``docker images``    (Con esto listamos las imágenes existentes)
3) ``docker run -d -p 3000:3000 --name app-nombre app:v1 ``

**(-d)** lo corre en segundo plano **(detached)**\
**(-p)** conecta el puerto 3000 de la PC hacia el 3000 del contenedor.\
**(--name)** creamos una etiqueta para referenciar a app:v1, de forma que sea más amigable al leer.\

## ¿Cómo debugueo errores?

Para ver la consola de errores usamos el siguiente comando:

``docker logs -f app-nombre``

## ¿Cómo destruyo el contenedor?

Ejecutando el siguiente comando:
``docker rm -f app-nombre``\
(Usamos el nombre creado como etiqueta)\
**(-f)** para forzar la detención.\