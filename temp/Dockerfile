FROM node:10.8.0-jessie

# Add our code to the container and install Node modules
COPY . /home/node/app/
RUN set -x \
    && npm install -g nodemon
    && cd /home/node/app \
    && npm install
