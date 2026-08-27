FROM node:20-alpine

# pnpm install කරන්න
RUN npm install -g pnpm

# Work directory එක set කරන්න
WORKDIR /app

# Package files copy කරන්න
COPY package.json pnpm-lock.yaml ./

# Dependencies install කරන්න (--no-frozen-lockfile with)
RUN pnpm install --no-frozen-lockfile

# Source code copy කරන්න
COPY . .

# Build කරන්න
RUN pnpm build

# Port එක expose කරන්න
EXPOSE 3000

# Start කරන්න
CMD ["pnpm", "start"]