# Use a lightweight Node.js image as the base
FROM node:18-slim

# Install Python3 needed for the web server
RUN apt-get update && apt-get install -y python3

# Set the working directory inside the container
WORKDIR /app

# Copy all our project files into the container
COPY . .

# Expose the port the server will run on
EXPOSE 8000

# The command to start the web server when the container runs
CMD ["python3", "-m", "http.server", "8000"]
