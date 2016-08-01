[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-deploy.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-deploy)
[![Coverage Status](https://coveralls.io/repos/github/ibm-cloud-solutions/hubot-ibmcloud-deploy/badge.svg?branch=cleanup)](https://coveralls.io/github/ibm-cloud-solutions/hubot-ibmcloud-deploy?branch=cleanup)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-deploy/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-deploy)
[![npm](https://img.shields.io/npm/v/hubot-ibmcloud-deploy.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-ibmcloud-deploy)

# hubot-ibmcloud-deploy

Script package that application deployment to the IBM Cloud through Hubot.

## Getting Started
  * [Usage](#usage)
  * [Commands](#commands)
  * [Hubot Adapter Setup](#hubot-adapter-setup)
  * [Development](#development)
  * [License](#license)
  * [Contribute](#contribute)

## Usage

If you are new to Hubot visit the [getting started](https://hubot.github.com/docs/) content to get a basic bot up and running.  Next, follow these steps for adding this external script into your hubot:

1. `cd` into your hubot directory
2. Install this package via `npm install hubot-ibmcloud-deploy --save`
3. Add `hubot-ibmcloud-deploy` to your `external-scripts.json`
4. Add the necessary environment variables:
```
HUBOT_BLUEMIX_API=<Bluemix API URL>
HUBOT_BLUEMIX_ORG=<Bluemix Organization>
HUBOT_BLUEMIX_SPACE=<Bluemix space>
HUBOT_BLUEMIX_USER=<Bluemix User ID>
HUBOT_BLUEMIX_PASSWORD=<Password for the Bluemix use>
```
5. Start up your bot & off to the races!

## Commands

- `hubot deploy` - Deployment setup with prompts for application and GitHub URL.
- `hubot deploy <app>` - Deployment setup for , or prompt you to provide a GitHub URL to deploy to .
- `hubot deploy <url>` - Deployment setup for and prompt you for the Bluemix application name.
- `hubot deploy <app> <url>` - Deployment of as on Bluemix.
- `hubot deploy help`- Show available deploy commands.

Your github repository should contain a `manifest.yml` that describes the deployment of the application.
More information about application deployment and manifest files can be read here: https://console.ng.bluemix.net/docs/manageapps/depapps.html#deployingapps

## Hubot Adapter Setup

Hubot supports a variety of adapters to connect to popular chat clients.  For more feature rich experiences you can setup the following adapters:
- [Slack setup](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/docs/adapters/slack.md)
- [Facebook Messenger setup](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/docs/adapters/facebook.md)

## Development

Please refer to the [CONTRIBUTING.md](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/CONTRIBUTING.md) before starting any work.  Steps for running this script for development purposes:

### Configuration Setup

1. Create `config` folder in root of this project.
2. Create `env` in the `config` folder, with the following contents:
```
export HUBOT_BLUEMIX_API=<Bluemix API URL>
export HUBOT_BLUEMIX_ORG=<Bluemix Organization>
export HUBOT_BLUEMIX_SPACE=<Bluemix space>
export HUBOT_BLUEMIX_USER=<Bluemix User ID>
export HUBOT_BLUEMIX_PASSWORD=<Password for the Bluemix use>
```
3. In order to view content in chat clients you will need to add `hubot-ibmcloud-formatter` to your `external-scripts.json` file. Additionally, if you want to use `hubot-help` to make sure your command documentation is correct. Create `external-scripts.json` in the root of this project, with the following contents:
```
[
	"hubot-help",
	"hubot-ibmcloud-formatter"
]
```
4. Lastly, run `npm install` to obtain all the dependent node modules.

### Running Hubot with Adapters

Hubot supports a variety of adapters to connect to popular chat clients.

If you just want to use:
 - Terminal: run `npm run start`
 - [Slack: link to setup instructions](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/docs/adapters/slack.md)
 - [Facebook Messenger: link to setup instructions](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/docs/adapters/facebook.md)

## License

See [LICENSE.txt](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-deploy/blob/master/CONTRIBUTING.md) for detailed information on how you can lend a hand.
