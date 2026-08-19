FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg tesseract-ocr python3 python3-pip ca-certificates curl unzip \
  && pip3 install --break-system-packages --no-cache-dir yt-dlp pillow \
  && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
  && rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/local/bin:${PATH}"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001
CMD ["npm", "run", "start"]
