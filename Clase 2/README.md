# CLASE 2

## Objetivo

Entender cómo usar y cuándo usar **dockercompose**

## Introducción

Dockercompose se utiliza para vincular dos imagenes dentro de un mismo contenedor, y que de esa forma puedan compartir recursos.
Es decir, si necesitas una base de datos para tu proyecto, entonces debes ser ca

El laboratorio estará dividido en dos partes:

* docker-compose local
* docker-compose servidor

## Compose Local

La diferencia subyase en que todo lo trabajaremos en un único archivo llamado docker-compose.yml.
Y que de esa forma creará e implementará las imágenes necesarias.

## Compose  Servidor/Producción

En este caso necesitaremos crear un Dockerfile para las aplicaciones que desarrollemos, de forma que crearemos una imagen,
e implementaremos esa imagen dentro de docker-compose.yml . Y de esa forma evitar que se pueda reflejar cualquier cambio ante un ataque o eliminación accidental.

