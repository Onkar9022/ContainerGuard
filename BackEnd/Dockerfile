FROM node:20-alpine

# Install Trivy vulnerability scanner CLI
RUN apk add --no-cache curl \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin \
    && trivy --version

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Copy the Prisma directory early so we can generate the Prisma Client
COPY prisma ./prisma/

# Install npm dependencies
RUN npm install

# Generate the Prisma Client using the copied schema
RUN npx prisma generate

# Copy the rest of the application source code into the container
COPY . .

# Expose the port that the Express backend listens on
EXPOSE 5000

# Set Node.js environment to production
ENV NODE_ENV=production

# Start the application using the existing production script from package.json
CMD ["npm", "run", "start"]
