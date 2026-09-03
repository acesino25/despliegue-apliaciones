# --- ETAPA 1: Builder (Pesada, con todas las herramientas) ---
FROM node:22 AS builder
WORKDIR /app
# Copiar dependencias primero para aprovechar la caché de Docker
COPY package*.json ./
RUN pnmp ci
# Copiar el resto del código y compilar (si aplica)
COPY . .

# --- ETAPA 2: Producción (Ligera y Segura) ---
# Alpine es una distribución de Linux que pesa alrededor de 5MB
FROM node:22-alpine
WORKDIR /app

# Copiar SOLO lo necesario de la etapa 'builder'
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src

# Crear y usar un usuario sin privilegios por seguridad (evita ser root)
USER node

# Documentar el puerto que la app usará
EXPOSE 3000

# Comando de arranque final
CMD ["npm", "start"]