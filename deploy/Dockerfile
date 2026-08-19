FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg tesseract-ocr python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001
CMD ["npm", "run", "start"]
