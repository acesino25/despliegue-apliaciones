# Multi Staged

Un multi staged tiene dos principales usos: seguridad puesto que la imagen resultante no tiene todas las herramientas disponibles para un atacante.
Y la segunda razón es el peso más ligero que posee la imagen resultante.

Además, tiene dos partes principales: 1) el builder, donde se compila. 2) producción/deployment, donde se usa un SO minimizado y coloca solo la app con comandos básicos

## Documento de ejemplo

------------
## BUILDER
------------

FROM **lenguaje**:**version** AS builder    <--- Imagen base para construir en el lenguaje necesario (contiene Debian + herramientas necesarias para compilar en, por ejemplo, node)  
WORKDIR /app                            <--- Definimos el directorio donde trabajaremos el proyecto

COPY **archivos-de-configuracion** ./  
RUN **comando-de-instalacion**  

COPY . .                                <--- Copiamos código generado (excluyendo lo que dockerignore nos declare)  
RUN **comando-de-build**

------------
## PRODUCCION
------------

FROM **lenguaje**:**version-ligera-de-alpine**  <--- Este será nuestro OS minimizado  
WORKDIR /app

COPY --from=builder /app/dependencias ./dependencias  
COPY --from=builder /app/codigo-compilado ./codigo-compilado

------------
## SEGURIDAD
------------

USER **usuario-sin-previgelio**     <--- Se inventa en el momento, mientras no sea root  
EXPOSE **PUERTO**                   <--- Exponemos puerto  

------------
## EJECUCIÓN
------------

CMD ["COMANDO DE EJECUCION NATIVO", "ARCHIVO-PRINCIPAL.EXTENSION]