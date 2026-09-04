#############################################
#############################################
# --- ETAPA 1: Builder (Pesada, con todas las herramientas) ---
FROM node:22 AS builder
WORKDIR /app

# 1. Habilitar pnpm nativamente usando corepack
RUN corepack enable pnpm

# 2. Copiar tanto el package.json como el lockfile específico de pnpm
COPY package.json pnpm-lock.yaml ./

# NUEVO: 3. Forzar a pnpm a guardar los archivos reales (no accesos directos)
RUN echo "node-linker=hoisted" > .npmrc

# 4. Ejecutar la instalación limpia
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar el resto del código
COPY . .

############################################
############################################

# --- ETAPA 2: Producción (Entorno de ejecución ligero) ---
FROM node:22-alpine
WORKDIR /app

# 1. Copiamos SOLO lo necesario desde la etapa 'builder'
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copiamos el código fuente (ajusta 'src' según la estructura de tu proyecto)
COPY --from=builder /app/index.js ./

# 2. Configuración de seguridad y red
USER node
EXPOSE 3000

# 3. Arranque nativo (¡Sin pnpm!)
CMD ["node", "index.js"]