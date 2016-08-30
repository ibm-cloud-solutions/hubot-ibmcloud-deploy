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
const mockUtils = require('./mock.utils.cf.js');
const mockCFUtils = require('./mock.utils.cf.js');
const mockESUtils = require('./mock.utils.es.js');

const i18n = new (require('i18n-2'))({
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
describe('Interacting with Deploy via NLS', function() {

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
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `I want help with deployment`', function() {
		it('should respond with the application deploy help', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('help.github.deploy'));
				expect(event.message).to.contain(i18n.__('help.github.deploy.app'));
				expect(event.message).to.contain(i18n.__('help.github.deploy.url'));
				expect(event.message).to.contain(i18n.__('help.github.deploy.app.url'));
				done();
			});

			const res = { message: {text: 'application deployment help', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.deploy.help', res, {});
		});
	});

	context('user calls `I want to deploy my application`', function() {
		it('should respond with the application deploy', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('github.deploy.in.progress', 'node-helloworld', 'normanb/node-helloworld'));
				done();
			});

			const res = { message: {text: 'start application deployment', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.deploy', res, {appname: 'node-helloworld', url: 'normanb/node-helloworld'});
		});
	});

	context('user calls `I want to deploy my application` and no appname', function() {
		it('should respond with an error requiring appname', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('github.deploy.name.invalid'));
				done();
			});

			const res = { message: {text: 'start application deployment', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.deploy', res, {url: 'normanb/node-helloworld'});
		});
	});

	context('user calls `I want to deploy my application` and no url', function() {
		it('should respond with an error requiring url', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				expect(event.message).to.be.a('string');
				expect(event.message).to.contain(i18n.__('github.deploy.repo.invalid'));
				done();
			});

			const res = { message: {text: 'start application deployment', user: {id: 'anId'}}, response: room };
			room.robot.emit('github.deploy', res, {appname: 'node-helloworld'});
		});
	});

});
