/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const nock = require('nock');
const path = require('path');
nock.disableNetConnect();
nock.enableNetConnect('localhost');

const ghApiEndpoint = 'https://api.github.com';
const ghEndpoint = 'https://github.com';

const mockBranches = require(path.resolve(__dirname, 'resources', 'mock.branches.json'));

module.exports = {

	setupMockery: function() {
		let ghScope = nock(ghEndpoint)
			.persist();

		let ghApiScope = nock(ghApiEndpoint)
			.persist();

		ghScope.get('/user/helloworld/archive/master.zip')
			.reply(200, {});

		ghScope.get('/normanb/node-helloworld/archive/master.zip')
			.reply(200, {});

		ghScope.get('/user/manifestTest/archive/master.zip')
			.replyWithFile(200, __dirname + '/resources/manifestTest/master.zip');

		ghScope.get('/user/manifestTest/archive/master.zip')
			.replyWithFile(200, __dirname + '/resources/manifestTest/master.zip');

		ghScope.get('/user/manifestTestNoApp/archive/master.zip')
			.replyWithFile(200, __dirname + '/resources/manifestTestNoApp/master.zip');

		ghScope.get('/user/manifestTestMultipleBranches/archive/test-branch.zip')
			.replyWithFile(200, __dirname + '/resources/manifestTest/master.zip');

		ghApiScope.get('/repos/user/manifestTest/branches')
			.reply(200, mockBranches.oneBranch);

		ghApiScope.get('/repos/user/manifestTestMultipleBranches/branches')
			.reply(200, mockBranches.multipleBranches);
	}
};
