/*
* Licensed Materials - Property of IBM
* (C) Copyright IBM Corp. 2016. All Rights Reserved.
* US Government Users Restricted Rights - Use, duplication or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
*/
'use strict';

const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;
const mockUtils = require('./mock.utils.gh.js');
const mockCFUtils = require('./mock.utils.cf.js');
const mockESUtils = require('./mock.utils.es.js');

// --------------------------------------------------------------
// i18n (internationalization)
// It will read from a peer messages.json file.  Later, these
// messages can be referenced throughout the module.
// --------------------------------------------------------------
var i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../src/messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/
describe('Interacting with Bluemix via Slack', function() {

	let room;
	let cf;

	before(function() {
		mockUtils.setupMockery();
		mockCFUtils.setupMockery();
		mockESUtils.setupMockery();
		// initialize cf, hubot-test-helper doesn't test Middleware
		cf = require('hubot-cf-convenience');
		return cf.promise.then();
	});

	beforeEach(function() {
		room = helper.createRoom();
		// Force all emits into a reply.
		room.robot.on('ibmcloud.formatter', function(event) {
			if (event.message) {
				event.response.reply(event.message);
			}
			else {
				event.response.send({attachments: event.attachments});
			}
		});
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `deploy help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot deploy help');
		});

		it('should respond with the help', function() {
			expect(room.messages.length).to.eql(2);
			expect(room.messages[1][1]).to.be.a('string');
		});
	});

	context('user calls `deploy`', function() {
		it('should respond with the deploy steps and fail', function() {
			return room.user.say('mimiron', '@hubot deploy').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				return room.user.say('mimiron', '@hubot yes');
			}).then(() => {
				expect(room.messages.length).to.eql(6);
				expect(room.messages[4]).to.eql(['hubot', '@mimiron ' + i18n.__('general.awesome')]);
				expect(room.messages[5]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.prompt.name')]);
				return room.user.say('mimiron', '@hubot helloworld helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(8);
				expect(room.messages[7]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.repo.invalid')]);
			});
		});
	});

	context('user calls `deploy` when apps have been defined', function() {
		beforeEach(function() {
			room.robot.brain.set('github-apps', {
				'node-helloworld': 'normanb/node-helloworld'
			});
		});
		afterEach(function() {
			room.robot.brain.remove('github-apps');
		});

		it('should respond with the apps it knows about', function() {
			return room.user.say('mimiron', '@hubot deploy').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				expect(room.messages[1]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.app.select')}`]);
				let event = room.messages[2][1];
				expect(event.attachments.length).to.eql(1);
				expect(event.attachments[0].title).to.eql('node-helloworld');
				return room.user.say('mimiron', '@hubot node-helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(5);
				expect(room.messages[4]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.in.progress', 'node-helloworld', 'normanb/node-helloworld')}`]);
			});
		});
	});

	context('user tries to deploy to an invalid repo', function() {
		it('should let the user know the deploy failed', function() {
			return room.user.say('mimiron', '@hubot deploy').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				return room.user.say('mimiron', '@hubot yes');
			}).then(() => {
				expect(room.messages.length).to.eql(6);
				expect(room.messages[4]).to.eql(['hubot', '@mimiron ' + i18n.__('general.awesome')]);
				expect(room.messages[5]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.prompt.name')]);
				return room.user.say('mimiron', 'normanb/dne node-helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(8);
				expect(room.messages[7]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.name.confirm', 'node-helloworld', 'normanb/dne')]);
				return room.user.say('mimiron', 'yes');
			}).then(() => {
				expect(room.messages.length).to.eql(10);
			});
		});
	});

	context('user calls `deploy` with app and repo', function() {

		it('should require that an app name and repo be set', function() {
			return room.user.say('mimiron', '@hubot deploy node-helloworld node-helloworld').then(() => {
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1][1]).to.be.a('String');
				expect(room.messages[1]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.repo.name.retry')}`]);
			});
		});

		it('should not matter which order the name and repo is provided', function() {
			return room.user.say('mimiron', '@hubot deploy normanb/node-helloworld node-helloworld').then(() => {
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1][1]).to.be.a('String');
				expect(room.messages[1]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.in.progress', 'node-helloworld', 'normanb/node-helloworld')}`]);
				return room.user.say('mimiron', '@hubot deploy node-helloworld normanb/node-helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(4);
				expect(room.messages[3][1]).to.be.a('String');
				expect(room.messages[3]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.in.progress', 'node-helloworld', 'normanb/node-helloworld')}`]);
			});
		});
	});

	it('should respond with the deploy steps', function() {
		return room.user.say('mimiron', '@hubot deploy').then(() => {
			expect(room.messages.length).to.eql(3);
			expect(room.messages[1][1]).to.be.a('String');
			return room.user.say('mimiron', '@hubot yes');
		}).then(() => {
			expect(room.messages.length).to.eql(6);
			expect(room.messages[4]).to.eql(['hubot', '@mimiron ' + i18n.__('general.awesome')]);
			expect(room.messages[5]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.prompt.name')]);
			return room.user.say('mimiron', 'normanb/node-helloworld node-helloworld');
		}).then(() => {
			expect(room.messages.length).to.eql(8);
			expect(room.messages[7]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.name.confirm', 'node-helloworld', 'normanb/node-helloworld')]);
			return room.user.say('mimiron', 'yes');
		}).then(() => {
			expect(room.messages.length).to.eql(10);
		});
	});

	context('user calls `deploy app`', function() {
		it('should respond with the deploy steps and fail', function() {
			return room.user.say('mimiron', '@hubot deploy app1').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				return room.user.say('mimiron', 'yes');
			}).then(() => {
				expect(room.messages.length).to.eql(6);
				expect(room.messages[4]).to.eql(['hubot', '@mimiron ' + i18n.__('general.awesome')]);
				expect(room.messages[5]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.repo.name.prompt')]);
				return room.user.say('mimiron', 'user/helloworld');
			});
		});

		it('should respond with the deploy steps and fail without a repo name', function() {
			return room.user.say('mimiron', '@hubot deploy app1').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				return room.user.say('mimiron', 'yes');
			}).then(() => {
				expect(room.messages.length).to.eql(6);
				expect(room.messages[4]).to.eql(['hubot', '@mimiron ' + i18n.__('general.awesome')]);
				expect(room.messages[5]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.repo.name.prompt')]);
				return room.user.say('mimiron', 'helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(8);
				expect(room.messages[7]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.repo.name.retry')]);
			});
		});
	});

	context('user calls `deploy app` and it exists', function() {
		beforeEach(function() {
			room.robot.brain.set('github-apps', {
				'node-helloworld': 'normanb/node-helloworld'
			});
		});
		afterEach(function() {
			room.robot.brain.remove('github-apps');
		});

		it('should respond with the apps that it will deploy', function() {
			return room.user.say('mimiron', '@hubot deploy node-helloworld').then(() => {
				expect(room.messages.length).to.eql(3);
				expect(room.messages[1][1]).to.be.a('String');
				expect(room.messages[1]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.in.progress.matching')}`]);
				expect(room.messages[2][1]).to.be.a('String');
				expect(room.messages[2]).to.eql(['hubot', `@mimiron ${i18n.__('github.deploy.in.progress', 'node-helloworld', 'normanb/node-helloworld')}`]);
			});
		});
	});

	context('user calls `deploy url`', function() {
		it('should respond with the deploy steps and fail', function() {
			return room.user.say('mimiron', '@hubot deploy user/helloworld').then(() => {
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.register.prompt')]);
				return room.user.say('mimiron', 'yes');
			}).then(() => {
				expect(room.messages.length).to.eql(4);
				expect(room.messages[3]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.name.prompt')]);
				return room.user.say('mimiron', 'helloworld');
			}).then(() => {
				expect(room.messages.length).to.eql(7);
				expect(room.messages[6]).to.eql(['hubot', '@mimiron ' + i18n.__('github.deploy.in.progress', 'helloworld', 'user/helloworld')]);
			});
		});
	});
});
