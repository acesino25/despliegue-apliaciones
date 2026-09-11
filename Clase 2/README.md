# CLASE 2

## Objetivo

Entender cómo usar y cuándo usar **dockercompose**

## Introducción

Dockercompose se utiliza para vincular dos imagenes dentro de un mismo contenedor, y que de esa forma puedan compartir recursos.

El laboratorio estará dividido en dos partes:

* docker-compose local
* docker-compose servidor

Y el **proyecto** con el que se trabajará es una web simple hecha en HTML y Javascript. Con un backend hecho con pocketbase.
(Si quieres saber más de pocketbase y su tecnología experimental te dejo la información en el siguiente link: [text](https://pocketbase.io/docs/))


### Conceptos antes de entrar de lleno:

**BACKEND** Es todo lo relacionado con lo no visual, casi siempre se tratará de un servicio que se dedica a servir información/recursos a un frontend u otros servicios.
A ello están asociadas bases de datos, servicios de APIs que conectan con la base de datos y sirven de puente para servir la información.

**FRONTEND** Es todo lo relacionado a lo visual, casi siempre es un servicio que consume o no consume servicios externos. No provee a otros servicios, ni suele conectar con bases de datos.

**¿Puede el FRONT ser back?** Sí, y no. Pueden co-existir, pero no significa (en términos técnicos) que el front es el back. Sino que el Back y el Front están en conjunto. Sucede con PHP que realiza un renderizado de la información en lo que se denomina **server-side / lado del servidor**. Sucede con Django al utilizar **templates** basados en html, sucede con Astro al activar la función serverside para securizar consultas con claves que requieren de un mayor grado de seguridad. En este último caso, de todas formas se debe utilizar claves de tipo públicas, y no privadas.


## Stack tecnológico

Trabajaremos con **pocketbase** como backend. Nos ofrece base de datos y una API con autenticación lista para usar.

En el proyecto ya tienen lista una landing con un ``index.html`` y un ``script.js``. El index muestra, y el script consulta, consume e inserta en el index.html los recursos que consume.


## Compose Local

La diferencia subyase en que todo lo trabajaremos en un único archivo llamado docker-compose.yml.
Y que de esa forma creará e implementará las imágenes necesarias.

Entonces, procederemos hacia un docker-compose.yml local. Esto lo hacemos cuando ya hemos creado nuestra aplicación y deseamos proceder a contenerizarla.

**NOTA:** A pesar de ya tener el docker-compose.yml ya generado, de todas formas seguiremos esta guía como si no lo tuviésemos.

### 1 - Creamos el archivo docker-compose.yml

```
# Definimos la version de compose (para que sepa qué estándares usaremos para comunicarnos)
version: '3.8'

# Definimos los servicios (nginx + backend BD basado en sqlite + pocketbase)
services:
  # NINGX Service para servir las peticiones hacia la landing
  web:
    image: nginx:alpine #Definimos la version de alpine con las herramientas necesarias para nginx
    ports:
      - "8080:80" # El puerto que nginx expone es el 80, mapeamos el 8080
    volumes:
      # Mapeamos ./public
      - ./public_html:/usr/share/nginx/html
    depends_on:
      - pb # Indicamos dependencia con pocketbase

  # Pocketbase
  pb:
    image: elestio/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      # Creamos la persistencia de los datos
      - pocketbase_data:/pb/pb_data

# Declaramos los volúmenes
volumes:
  pocketbase_data: #Dejamos vacío porque no deseamos alterar manualmente nada. Podríamos hacerlo si deseamos guardarlo en un disco externo.
```


### 2 - Comandos para crear las imágenes y contenerizar

``docker compose up -d``

Si necesitamos ver los contenedores creados:

``docker ps -a``

Si necesitas ver la consola de alguno:

``docker logs -f nombre-contenedor``

### 2 - Configurar pocketbase

* 1 - Veremos los logs del contenedor de pocketbase:

``docker logs -f milanding-pb-1``

* 2 - Habrá una URL que nos permitirá crear un super usuario:

```
(!) Launch the URL below in the browser if it hasn't been open already to create your first superuser account:
http://0.0.0.0:8090/_/#/pbinstall/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc4ODk1NTM2NywiaWQiOiI4ZjQxbm95Zm9lZW90d2wiLCJyZWZyZXNoYWJsZSI6ZmFsc2UsInR5cGUiOiJhdXRoIn0.wI619fS1lItS95uIzHU_jLLOQmFnRNSdNijyvTeVXrc
(you can also create your first superuser by running: /usr/local/bin/pocketbase superuser upsert EMAIL PASS)
```

Nosotros la copiaremos y reemplazaremos los "o" con localhost:

``http:/localhost:8090/_/[...]``

Al completar lo del usuario podremos acceder al administrador de pocketbase a través de la siguiente url: [text](http:/localhost:8090/_/)

### 3 - Configurar pocketbase

![Colecciones](image.png)
Creamos una nueva "Collection" llamada "alumnos". (Es lo mismo que decir tablas)

![Filas](image-1.png)
A lo que existe como plantilla agregaremos la columna "nombre" de tipo texto.

![Permisos](image-2.png)
Configuraremos los permisos de quiénes pueden acceder a ver la lista de alumnos

![API Rules](image-3.png)
Vamos a API Rules. Y quitamos el candado de "Superuser Only" y dejamos vacío. Para que de esa forma cualquiera pueda realizar la acción de SELECT o VER sin estar logueado.
Guardamos los cambios.

Podemos cargar una fila de ejemplo para tener datos para ver.

### 4 - Revisar localhost:8080

![Landing](image-4.png)
Vamos a la landing en localhost:8080 y revisamos si se carga correctamente el ejemplo que hemos cargado.

## Compose  Servidor/Producción

En este caso necesitaremos crear un Dockerfile para las aplicaciones que desarrollemos, de forma que crearemos una imagen,
e implementaremos esa imagen dentro de docker-compose.yml. La diferencia es que en local nosotros creamos la imagen a través de docker-compose.yml, pero estamos haciendo mirror/espejo en tiempo real y si por accidente eliminamos la carpeta madre de donde se refleja, entonces, este cambio se refleja en la imagen.





