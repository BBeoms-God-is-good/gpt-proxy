# 1. Node.js 기반 이미지
FROM node:18

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 파일 복사
COPY package*.json ./

# 4. 패키지 설치
RUN npm install

# 5. 전체 소스 복사
COPY . .

# 6. 포트 명시 (선택)
EXPOSE 3000

# 7. 앱 실행
CMD ["npm", "start"]
