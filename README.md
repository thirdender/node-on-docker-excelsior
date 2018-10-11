# Node On Docker Excelsior!

Node on Docker is pretty cool, especially when deploying your code to a remote server. Unfortunately, most configurations found by a quick Google search are missing a myriad of essential options. This CLI wizard aims to quickly build a superior Docker configuration for your Node project. Excelsior!

* `npm install` is run during build, ensuring that module versions match the version of Node running in the container
* `docker-composer.override.yml` contains local dev quality of life improvements:
  + Your local source code is bind mounted into the container so you get live updates as you change code outside the container
* The wizard will walk you through configuring an optional database container, including setting up [Adminer](https://www.adminer.org/)
* A basic [Traefik](https://traefik.io/) reverse proxy configuration is included, and can be set up to automatically request SSL certificates from [Let's Encrypt](https://letsencrypt.org/)
