FROM node:18

WORKDIR /app

# 캐시 클리어 후 설치
RUN npm config set fetch-retries 5 \
  && npm config set retry 5 \
  && npm config set fetch-timeout 60000 \
  && npm config set registry https://registry.npmjs.org/ \
  && npm cache clean --force

COPY package*.json ./

RUN npm install --no-cache --legacy-peer-deps || npm install --force

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
