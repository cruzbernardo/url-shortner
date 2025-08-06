# Dockerfile
FROM node:20

WORKDIR /app

# Copia apenas os arquivos de dependência para aproveitar cache
COPY package*.json ./

RUN npm install

# Copia o restante do projeto
COPY . .

EXPOSE 3000

# Executa o Nest em modo dev, com reinício automático
CMD ["npm", "run", "start:dev"]
