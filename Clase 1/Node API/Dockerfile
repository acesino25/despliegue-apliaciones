#############################################
#############################################
# --- ETAPA 1: Builder (Pesada, con todas las herramientas) ---
FROM node:22 AS builder
WORKDIR /app

# 1. Habilitar pnpm nativamente usando corepack
RUN corepack enable pnpm

# 2. Copiar tanto el package.json como el lockfile específico de pnpm
COPY package.json pnpm-lock.yaml ./

# 3. Ejecutar la instalación limpia (el equivalente a npm ci)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar el resto del código
COPY . .

############################################
############################################

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
CMD ["pnpm", "start"]