FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copies package.json and package-lock.json to Docker environment
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of your application's source files
COPY . .

# Informs Docker that the container listens on the specified network ports at runtime.
EXPOSE 4000

CMD ["npm", "run", "start:dev"]
