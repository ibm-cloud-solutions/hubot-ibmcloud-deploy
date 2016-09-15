// Description:
//	Listens for commands to initiate actions against Bluemix
//
// Configuration:
//	 HUBOT_BLUEMIX_API Bluemix API URL
//	 HUBOT_BLUEMIX_ORG Bluemix Organization
//	 HUBOT_BLUEMIX_SPACE Bluemix space
//	 HUBOT_BLUEMIX_USER Bluemix User ID
//	 HUBOT_BLUEMIX_PASSWORD Password for the Bluemix User
//   	 HUBOT_GITHUB_TOKEN <optional> Github API Auth token
//
// Commands:
//  	hubot deploy help - Show available commands in the deploy category.
//	hubot deploy - Deployment setup with prompts for application, GitHub URL and branch.
//	hubot deploy <app> - Deployment setup for app, or prompt you to provide a GitHub URL and branch to depoy to.
//	hubot deploy <url> - Deployment setup for url and prompt you for the Bluemix application name and branch.
//	hubot deploy <app> <url> - Deployment of app with url, prompt for branch if not provided.
//
// Author:
//	aeweidne
//	reicruz
//
'use strict';

// external dependencies
const Conversation = require('hubot-conversation');
const _ = require('lodash');
const request = require('request');
const os = require('os');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const github = require('../lib/github');

const TAG = path.basename(__filename);

// us
const palette = require('hubot-ibmcloud-utils').palette;
const utils = require('hubot-ibmcloud-utils').utils;
const cf = require('hubot-cf-convenience');
const activity = require('hubot-ibmcloud-activity-emitter');

const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

// ----------------------------------------------------
// Start of the HUBOT interactions.
// ----------------------------------------------------
module.exports = function(robot) {

	// for dialog
	const switchBoard = new Conversation(robot);

	// Natural Language match
	robot.on('github.deploy', (res, parameters) => {
		robot.logger.debug(`${TAG}: github.deploy - Natural Language match - res.message.text=${res.message.text}.`);
		if (parameters && parameters.appname) {
			if (parameters && parameters.url) {
				const entry = { app: parameters.appname, url: parameters.url };
				processAppDeploy(robot, res, switchBoard, entry);
			}
			else {
				robot.logger.error(`${TAG}: Error extracting repository from text [${res.message.text}].`);
				let message = i18n.__('github.deploy.repo.invalid');
				robot.emit('ibmcloud.formatter', { response: res, message: message});
			}
		}
		else {
			robot.logger.error(`${TAG}: Error extracting App Name from text [${res.message.text}].`);
			let message = i18n.__('github.deploy.name.invalid');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
	});

	// Natural Language match
	robot.on('github.deploy.help', (res, parameters) => {
		robot.logger.debug(`${TAG}: github.deploy.help - Natural Language match - res.message.text=${res.message.text}.`);
		printHelp(res, robot);
	});


	robot.respond(/deploy$/i, {id: 'github.deploy'}, (res) => {
		robot.logger.debug(`${TAG}: res.message.text=${res.message.text}.`);
		// will be reassigning when we omit duplicates
		let apps = robot.brain.get('github-apps') || {};

		if (_.isEmpty(apps)) {
			let message = i18n.__('github.deploy.register.empty');
			robot.emit('ibmcloud.formatter', { response: res, message: message});

			let prompt = i18n.__('github.deploy.prompt');
			let negativeResponse = i18n.__('github.deploy.prompt.deny');
			utils.getConfirmedResponse(res, switchBoard, prompt, negativeResponse).then((dialogResult) => {
				let message = i18n.__('general.awesome');
				robot.emit('ibmcloud.formatter', { response: res, message: message});
				let prompt = i18n.__('github.deploy.prompt.name');
				utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.+\/.+)\s(.+)/i).then((registerRes) => {
					const entry = sortRegisterInput(registerRes.match[1], registerRes.match[2]);
					let prompt = i18n.__('github.deploy.name.confirm', entry.app, entry.url);
					let negativeResponse = i18n.__('github.deploy.failure');
					utils.getConfirmedResponse(res, switchBoard, prompt, negativeResponse).then((dialogResult) => {
						getEntry(robot, res, switchBoard, entry).then(entry => {
							let message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
							robot.emit('ibmcloud.formatter', { response: res, message: message});
							apps[entry.app] = entry.url;
							// update brain
							robot.brain.set('github-apps', apps);

							robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
							const activeSpace = cf.activeSpace(robot, res);
							cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
								robot.logger.info(`${TAG}: cf library returned with app info for ${entry.app}.`);
								deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
							})
							.catch((err) => {
								robot.logger.error(`${TAG}: An error occurred.`);
								robot.logger.error(err);
							});
						});
					});
				});
			});
		}
		else {
			const attachments = Object.keys(apps).map((app) => {
				const attachment = {
					title: app,
					color: palette.normal
				};
				attachment.fields = [
					{title: 'repo', value: apps[app]}
				];

				const expr = new RegExp(`(${app})`, 'i');

				robot.logger.debug(`${TAG}: adding a dialog choice for ${app} that is ${expr.toString()}`);
				let prompt = i18n.__('github.deploy.app.select');
				utils.getExpectedResponse(res, robot, switchBoard, prompt, expr).then((response) => {
					let chosenApp = response.match[1];
					const entry = {app: chosenApp, url: apps[chosenApp]};
					getEntry(robot, res, switchBoard, entry).then(entry => {
						let message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
						robot.emit('ibmcloud.formatter', { response: res, message: message});
						const activeSpace = cf.activeSpace(robot, res);
						robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
						cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
							robot.logger.info(`${TAG}: cf library returned with app info for  ${entry.app}.`);
							deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
						})
						.catch((err) => {
							robot.logger.error(`${TAG}: An error occurred.`);
							robot.logger.error(err);
						});
					});
				});

				return attachment;
			});

			// Emit the app status as an attachment
			robot.emit('ibmcloud.formatter', {
				response: res,
				attachments
			});
		}
	});

	robot.respond(/deploy\s+(\S+)$/i, {id: 'github.deploy'}, (res) => {
		robot.logger.debug(`${TAG}: res.message.text=${res.message.text}.`);
		// will be reassigning when we omit duplicates
		let apps = robot.brain.get('github-apps') || {};

		const input = res.match[1];

		if (input.indexOf('/') > -1) {
			let prompt = i18n.__('github.deploy.register.prompt');
			let negativeResponse = i18n.__('github.deploy.register.not.happening');
			utils.getConfirmedResponse(res, switchBoard, prompt, negativeResponse).then((dialogResult) => {
				let prompt = i18n.__('github.deploy.name.prompt');
				utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then((nameRes) => {
					const entry = {app: nameRes.match[1], url: input};
					let message = i18n.__('github.deploy.register.in.progress', entry.app, entry.url);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
					apps[entry.app] = entry.url;
					// update brain
					robot.brain.set('github-apps', apps);
					getEntry(robot, res, switchBoard, entry).then(entry => {
						message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
						robot.emit('ibmcloud.formatter', { response: res, message: message});
						const activeSpace = cf.activeSpace(robot, res);
						robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
						cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
							robot.logger.info(`${TAG}: cf library returned with app info for  ${entry.app}.`);
							deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
						})
						.catch((err) => {
							robot.logger.error(`${TAG}: An error occurred.`);
							robot.logger.error(err);
						});
					});
				});
			});
		}
		else {
			if (input === 'help') {
				printHelp(res, robot);
			}
			else {
				const matchingApps = Object.keys(apps).filter((app) => {
					return app === input;
				});

				if (_.isEmpty(matchingApps)) {
					let message = i18n.__('github.deploy.name.not.found', input);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
					let prompt = i18n.__('github.deploy.repo.prompt');
					let negativeResponse = i18n.__('general.ok.another.time');
					utils.getConfirmedResponse(res, switchBoard, prompt, negativeResponse).then(() => {
						let message = i18n.__('general.awesome');
						robot.emit('ibmcloud.formatter', { response: res, message: message});
						let prompt = i18n.__('github.deploy.repo.name.prompt');
						utils.getExpectedResponse(res, robot, switchBoard, prompt, /(.*)/i).then((urlRes) => {
							const url = urlRes.match[1];

							if (url.indexOf('/') === -1) {
								let message = i18n.__('github.deploy.repo.name.retry');
								robot.emit('ibmcloud.formatter', { response: res, message: message});
							}
							else {
								const entry = { app: input, url: url };
								// upsert into apps object
								apps[entry.app] = entry.url;
								getEntry(robot, res, switchBoard, entry).then(entry => {
									let message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
									robot.emit('ibmcloud.formatter', { response: res, message: message});
									const activeSpace = cf.activeSpace(robot, res);
									robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
									cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
										robot.logger.info(`${TAG}: cf library returned with app info for  ${entry.app}.`);
										deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
									})
									.catch((err) => {
										robot.logger.error(`${TAG}: An error occurred.`);
										robot.logger.error(err);
									});
								});
							}
						});
					});
				}
				else {
					let message = i18n.__('github.deploy.in.progress.matching');
					robot.emit('ibmcloud.formatter', { response: res, message: message});
					matchingApps.forEach((app) => {
						const entry = {app: app, url: apps[app]};
						getEntry(robot, res, switchBoard, entry).then(entry => {
							let message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
							robot.emit('ibmcloud.formatter', { response: res, message: message});
							const activeSpace = cf.activeSpace(robot, res);
							robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
							cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
								robot.logger.info(`${TAG}: cf library returned with app info for  ${entry.app}.`);
								deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
							})
							.catch((err) => {
								robot.logger.error(`${TAG}: An error occurred.`);
								robot.logger.error(err);
							});
						});
					});
				}
			}
		}
	});

	robot.respond(/deploy\s+(\S+)\s+(\S+)$/i, {id: 'github.deploy'}, (res) => {
		robot.logger.debug(`${TAG}: res.message.text=${res.message.text}.`);

		const entry = sortRegisterInput(res.match[1], res.match[2]);
		processAppDeploy(robot, res, switchBoard, entry);

	});
};

const sortRegisterInput = (input1, input2) => {
	// apps can't have /, user/repo always will
	// perform simple check
	if (input1.indexOf('/') > -1) {
		// second one is name
		return { url: input1, app: input2 };
	}
	else if (input2.indexOf('/') > -1) {
		// first one is name
		return { url: input2, app: input1 };
	}
};

const deploy = (app, appGuid, spaceGuid, spaceName, robot, res) => {
	let domain = '';
	let appZip;
	let applicationGuid;
	let temp = os.tmpdir();
	let now = Date.now();
	let deploymentDir = `${temp}/${now}`;
	let filename = `${deploymentDir}/${app.repo}_${now}.zip`;
	let applicationDomain;
	let applicationHost;
	let applicationDomainGuid;
	let jsonManifest = {};

	// handle domain
	if (process.env.HUBOT_GITHUB_DOMAIN) {
		domain = process.env.HUBOT_GITHUB_DOMAIN.replace(/^https?:\/\//, '');
	}
	else {
		domain = 'github.com';
	}

	robot.logger.info(`${TAG}: Beginning deployment steps for ${app.app} ...`);
	getUserRepo(robot, domain, app.user, app.repo, app.branch)
	.then((bf) => {
		let message = i18n.__('github.deploy.obtaining.zip', app.app);
		robot.emit('ibmcloud.formatter', { response: res, message: message});

		robot.logger.info(`${TAG}: Repository data obtained for ${app.app}.`);
		return restructureZipAsync(bf);
	}).then((zip) => {
		robot.logger.info(`${TAG}: Application zip created for ${app.app}.`);
		appZip = zip;

		fs.mkdirSync(deploymentDir);
		appZip.writeZip(filename);

		//	reload the file to initialize the appZip object with data.
		appZip = new AdmZip(filename);
		let ymlString = appZip.readAsText('manifest.yml');
		if (ymlString !== '') {
			robot.logger.info(`${TAG}: using manifest.yml found in given repo for ${app.app}.`);
			fs.writeFileSync(deploymentDir + '/manifest.yml', ymlString);
			jsonManifest = YAML.load(deploymentDir + '/manifest.yml');
		}

		if (!appGuid){
			let appOptions = {
				name: app.app,
				space_guid: spaceGuid
			};

			applicationHost = app.app;

			if (jsonManifest.applications) {
				if (jsonManifest.applications[0].memory) {
					appOptions.memory = getValueInMB(jsonManifest.applications[0].memory, robot);
				}
				if (jsonManifest.applications[0].disk_quota) {
					appOptions.disk_quota = getValueInMB(jsonManifest.applications[0].disk_quota, robot);
				}
				if (jsonManifest.applications[0].instances) {
					appOptions.instances = jsonManifest.applications[0].instances;
				}
				if (jsonManifest.applications[0].env) {
					appOptions.environment_json = jsonManifest.applications[0].env;
				}
				if (jsonManifest.applications[0].domain) {
					applicationDomain = jsonManifest.applications[0].domain;
				}
				if (jsonManifest.applications[0].host) {
					applicationHost = jsonManifest.applications[0].host;
				}
				if (jsonManifest.applications[0].buildpack) {
					appOptions.buildpack = jsonManifest.applications[0].buildpack;
				}
				if (jsonManifest.applications[0].command) {
					appOptions.command = jsonManifest.applications[0].command;
				}
			}

			robot.logger.info(`${TAG}: Application ${app.app} does not yet exist, using cf library to make an asynch call to create the app.`);
			let message = i18n.__('github.deploy.create.app', app.app);
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			return cf.Apps.add(appOptions);
		}
		else {
			return new Promise((resolve, reject) => {
				resolve({});
			});
		}
	}).then((appInfo) => {
		return new Promise((resolve, reject) => {
			if (appGuid) {
				resolve(appGuid);
			}
			else {
				robot.logger.info(`${TAG}: Application ${app.app} was created with guid ${appInfo.metadata.guid}.`);
				if (appInfo && appInfo.metadata && appInfo.metadata.guid) {
					cf.Domains.getSharedDomains().then((result) => {
						if (applicationDomain) {
							result.resources.some((resource) => {
								if (resource.entity.name === applicationDomain) {
									applicationDomainGuid = resource.metadata.guid;
								}
							});
						}
						else {
							applicationDomainGuid = result.resources[0].metadata.guid;
						}
						if (applicationHost) {
							robot.logger.info(`${TAG}: Using domain ${applicationDomainGuid} for application ${app.app}`);
							cf.Routes.getRoutes({q: `host:${applicationHost};domain_guid:${applicationDomainGuid}` }).then((result) => {
								const found = result.resources.some((resource) => {
									if (resource.entity.host === applicationHost) {
										cf.Apps.associateRoute(appInfo.metadata.guid, resource.metadata.guid);
										return true;
									}
								});
								if (!found) {
									let routeOptions = {
										host: applicationHost,
										domain_guid: applicationDomainGuid,
										space_guid: spaceGuid};
									cf.Routes.add(routeOptions).then((result) => {
										robot.logger.info(`${TAG}: Binding route with guid ${result.metadata.guid} to application ${app.app}`);
										cf.Apps.associateRoute(appInfo.metadata.guid, result.metadata.guid);
									})
									.catch((err) => {
										let message = i18n.__('github.deploy.route.error', JSON.parse(err).description);
										robot.emit('ibmcloud.formatter', { response: res, message: message});
									});
								};
							})
							.catch((err) => {
								robot.logger.error(`${TAG}: An error occurred getting Route.`);
								robot.logger.error(err);
							});
						}
					})
					.catch((err) => {
						robot.logger.error(`${TAG}: An error occurred getting domains.`);
						robot.logger.error(err);
					});
					resolve(appInfo.metadata.guid);
				}
				else {
					robot.logger.error(`${TAG}: Application ${app.app} was not created with a guid.`);
					reject('Application creation error occurred.'); // TODO: no app guid
				}
			}
		});
	}).then((guid) => {
		applicationGuid = guid;
		if (appZip) {
			let message = i18n.__('github.deploy.uploading.app', app.app, process.env.HUBOT_BLUEMIX_ORG, spaceName);
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			robot.logger.info(`${TAG}: Application ${app.app} will be uploaded using a cf library asynch method from ${filename}.`);
			return cf.Apps.upload(guid, filename, false);
		}
		else {
			return new Promise((resolve, reject) => {
				robot.logger.error(`${TAG}: Application ${app.app} was not created as the zip file could not be deployed.`);
				reject('An error occurred deploying application zip file.');
			});
		}
	}).then((uploadResult) => {
		activity.emitBotActivity(robot, res, {
			activity_id: 'activity.github.deploy',
			app_name: app.app,
			app_guid: applicationGuid, // it's okay if it's undefined.
			space_name: spaceName,
			space_guid: spaceGuid
		});
		let message = i18n.__('github.deploy.starting.app', app.app);
		robot.emit('ibmcloud.formatter', { response: res, message: message});
		robot.logger.info(`${TAG}: Application ${app.app} was successfully deployed.`);
		return cf.Apps.start(applicationGuid);
	}).then(() => {
		robot.logger.info(`${TAG}: Application ${app.app} was started.`);
		setTimeout(() => {
			robot.logger.info(`${TAG}: Asynch call using cf library to obtain app summary for ${app.app} in space ${spaceName}.`);
			cf.Apps.getSummary(applicationGuid).then((result) => {
				let appSummary = result;
				let appSummaryStr = '';
				if (appSummary) {
					appSummaryStr = JSON.stringify(appSummary);
				}
				robot.logger.info(`${TAG}: Obtain app summary for ${app.app}: ${appSummaryStr}.`);
				if (result && result.state === 'STARTED') {
					let appRoute = '';
					if (appSummary.routes[0]) {
						appRoute = 'http://' + appSummary.routes[0].host + '.' + appSummary.routes[0].domain.name;
					}
					let message = i18n.__('github.deploy.app.complete', app.app, process.env.HUBOT_BLUEMIX_ORG, spaceName, appRoute);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
				}
				else {
					let message = i18n.__('github.deploy.app.unknown', app.app);
					robot.emit('ibmcloud.formatter', { response: res, message: message});
				}
			});
		}, 60000);
	}).catch((err) => {
		let message = i18n.__('github.deploy.error', app.app, err);
		robot.emit('ibmcloud.formatter', { response: res, message: message});
		robot.logger.error(`${TAG}: An error occurred during application deployment of ${app.app}:`);
		robot.logger.error(err);
	});

};

const printHelp = (res, robot) => {
	let help = robot.name + ' deploy - ' + i18n.__('help.github.deploy') + '\n'
	+ robot.name + ' deploy <app> - ' + i18n.__('help.github.deploy.app') + '\n'
	+ robot.name + ' deploy <url> - ' + i18n.__('help.github.deploy.url') + '\n'
	+ robot.name + ' deploy <app> <url>- ' + i18n.__('help.github.deploy.app.url') + '\n';
	robot.emit('ibmcloud.formatter', { response: res, message: '\n' + help});
};


const getUserRepo = (robot, domain, repoowner, reponame, branch) => {
	let gitBranch = branch;
	let url = `https://${domain}/${repoowner}/${reponame}/archive/${gitBranch}.zip`;

	robot.logger.info(`${TAG}: Obtaining application code from  ${url}.`);
	return asyncGet(robot, url);
};

const getValueInMB = (input, robot) => {
	let valueInMB = 0;
	let numbers = input.match(/\d+/)[0];
	const lastChar = input.substr(input.length - 1);
	switch (lastChar) {
	case 'G':
		valueInMB = numbers * 1024;
		break;
	case 'M':
		valueInMB = numbers;
		break;
	default:
		robot.logger.info(`${TAG}: Invalid unit in value, assuming M.`);
		valueInMB = numbers;
	}
	return parseInt(valueInMB, 10);
};

function restructureZipAsync(buf) {
	// TODO use async zip functions
	return new Promise((resolve, reject) => {
		let zip = new AdmZip(buf);
		let entries = zip.getEntries();
		let topFolder = entries[0].entryName;

		let newZip = AdmZip();
		// skip top folder
		for (let i = 1; i < entries.length; i++){
			let name = entries[i].entryName.substring(topFolder.length);
			let data = entries[i].getData();
			newZip.addFile(name, data);
		}
		resolve(newZip);
	});
};

function asyncGet(robot, url) {
	return new Promise((resolve, reject) => {
		request({
			url: `${url}`,
			encoding: null
		}, (e, r, body) => {
			if (e) {
				robot.logger.error(`${TAG}: Unable to obtain data from ${url}.`);
				reject(e);
			}
			else {
				robot.logger.info(`${TAG}: Obtained data from ${url}.`);
				resolve(body);
			}
		});
	});
};

function processAppDeploy(robot, res, switchBoard, entry){
	let apps = robot.brain.get('github-apps') || {};

	if (!entry) {
		let message = i18n.__('github.deploy.repo.name.retry');
		robot.emit('ibmcloud.formatter', { response: res, message: message});
	}
	else {
		getEntry(robot, res, switchBoard, entry).then(entry => {
			// upsert
			apps[entry.app] = entry.url;
			// get to deployment
			let message = i18n.__('github.deploy.in.progress', entry.app, entry.branch, entry.url);
			robot.emit('ibmcloud.formatter', { response: res, message: message});
			const activeSpace = cf.activeSpace(robot, res);
			robot.logger.info(`${TAG}: Asynch call using cf library to obtain application data for ${entry.app}.`);
			cf.Apps.getApp(entry.app, activeSpace.guid).then((result) => {
				robot.logger.info(`${TAG}: cf library returned with app info for  ${entry.app}.`);
				deploy(entry, result ? result.metadata.guid : undefined, activeSpace.guid, activeSpace.name, robot, res);
			})
			.catch((err) => {
				robot.logger.error(`${TAG}: An error occurred.`);
				robot.logger.error(err);
			});
		});
	}
}

function getEntry(robot, res, switchBoard, entry) {
	return new Promise((resolve, reject) => {
		const regex = /(.*)\/tree\/(.*)/;
		const match = regex.exec(entry.url);
		entry.branch = match !== null ? match[2] : undefined;
		entry.url = match !== null ? match[1] : entry.url;

		const urlTokens = entry.url.split('/');
		entry.repo = urlTokens.pop();
		entry.user = urlTokens.pop();

		if (entry.branch) {
			resolve(entry);
		}
		else {
			github.repos.getBranches({
				user: entry.user,
				repo: entry.repo
			}, (err, branches) => {
				if (!err) {
					if (branches.length === 1) {
						entry.branch = branches[0].name;
						resolve(entry);
					}
					else {
						const regex = utils.generateRegExpForNumberedList(branches.length + 1);
						let prompt = i18n.__('github.deploy.branch.prompt') + '\n';
						for (let i = 0; i < branches.length; i++) {
							prompt += `(${i + 1})  ${branches[i].name}\n`;
						}
						utils.getExpectedResponse(res, robot, switchBoard, prompt, regex).then((result) => {
							let response = result.match[1];
							let resNum = parseInt(response, 10);
							entry.branch = branches[resNum - 1].name;
							resolve(entry);
						}).catch((err) => {
							reject(err);
						});
					}
				}
				else {
					let prompt = i18n.__('github.deploy.branch.prompt');
					utils.getExpectedResponse(res, robot, switchBoard, prompt, /(?:\S+\s+){1}(\S+)/i).then((branchRes) => {
						entry.branch = branchRes.match[1];
						resolve(entry);
					}).catch((err) => {
						reject(err);
					});
				}
			});
		}
	});
}
