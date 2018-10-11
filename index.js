const pkg = require('./package.json');
const program = require('commander');
const inquirer = require('inquirer');
const yaml = require('js-yaml');
const toml = require('toml');
const tomlify = require('tomlify-j0.4');
const envfile = require('envfile');
const fs = require('fs');

program
  .version(pkg.version)
  .parse(process.argv);

const templates = {
  'docker-compose.yml': yaml.safeLoad(
    fs.readFileSync('./templates/docker-compose.yml', 'utf8')
  ),
  'docker-compose.override.yml': yaml.safeLoad(
    fs.readFileSync('./templates/docker-compose.override.yml', 'utf8')
  ),
  'traefik.toml': toml.parse(
    fs.readFileSync('./templates/traefik.toml', 'utf8')
  ),
};

const databaseChoices = {
  'PostgreSQL': {
    service: {
      image: 'postgres',
      environment: [
        'POSTGRES_PASSWORD',
      ],
    },
    callback: (service, answers, env) => {
      env.POSTGRES_PASSWORD = answers.databasePassword;
    },
  },
};

inquirer
  .prompt([
    {
      message: 'Do you want to include the Traefik reverse proxy?',
      name: 'traefik',
      type: 'confirm',
      default: true,
    }, {
      message: 'Enter the hostname where your website will be hosted',
      name: 'hostname',
      type: 'prompt',
      validate: value => !!value,
      when: answers => answers.traefik,
    }, {
      message: 'Enter your e-mail address for the SSL certificate',
      name: 'email',
      type: 'prompt',
      validate: value => !!value,
      when: answers => answers.hostname,
    }, {
      message: 'Do you want to include a database container?',
      name: 'database',
      type: 'list',
      choices: Object.keys(databaseChoices)
        .concat(['No database']),
      filter: value => {
        return databaseChoices[value];
      },
    }, {
      message: 'Database root password? (leave blank to generate a random password)',
      name: 'databasePassword',
      type: 'input',
      when: answers => answers.database,
      filter: value => {
        // Generate a password if one is not provided
        return value !== '' ? value :
          require('generate-password').generate({
            length: 16,
            numbers: true,
          });
      },
    }, {
      message: 'Do you want to include the Adminer web UI?',
      name: 'adminer',
      type: 'confirm',
      default: true,
      when: answers => (answers.traefik && answers.database),
    },
  ])
  .then(answers => {
    let template = templates['docker-compose.yml'],
        templateOverride = templates['docker-compose.override.yml'],
        templateTraefik = templates['traefik.toml'],
        env = {};

    // Configure Traefik
    if (!answers.traefik) {
      delete template.services.traefik;
    }
    if (answers.hostname) {
      env.HOSTNAME = answers.hostname;
    }

    // Extend the database service with the selected options
    if (!answers.database) {
      delete template.services.db;
    } else {
      Object.assign(template.services.db, answers.database.service);
      if ('callback' in answers.database) {
        answers.database.callback.call(null, template.services.db, answers, env);
      }
    }

    // Remove the Adminer service if it wasn't chosen
    if (!answers.adminer) {
      delete template.services.adminer;
      delete templateOverride.services.adminer;
    }

    // Write docker-compose.yml files
    fs.writeFileSync('./temp/docker-compose.yml', yaml.dump(template));
    fs.writeFileSync('./temp/docker-compose.override.yml', yaml.dump(templateOverride));

    // Copy Dockerfile
    fs.copyFileSync('./templates/Dockerfile', './temp/Dockerfile');

    // Write traefik.toml
    templateTraefik.acme.email = answers.email;
    fs.writeFileSync('./temp/traefik.toml', tomlify.toToml(templateTraefik));

    // Create a blank acme.json file where the SSL keys will be stored
    fs.closeSync(fs.openSync('./temp/acme.json', 'w'));
    fs.chmodSync('./temp/acme.json', 0o600);

    // Write the .env file
    fs.writeFileSync('./temp/.env', envfile.stringifySync(env));
  });
