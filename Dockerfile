FROM node:18

WORKDIR /app

# 종속성 파일 복사
COPY package*.json ./

# npm 설치 강제 재시도 + 무시 옵션
RUN npm install --legacy-peer-deps --force

# 앱 전체 복사
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
