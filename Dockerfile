FROM oven/bun:latest as base

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]