/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const nock = require('nock');
nock.disableNetConnect();
nock.enableNetConnect('localhost');

const endpoint = 'https://github.com:443';

module.exports = {

	setupMockery: function() {
		let ghScope = nock(endpoint)
			.persist();

		ghScope.get('/user/helloworld/archive/master.zip')
			.reply(200, {});

		ghScope.get('/normanb/node-helloworld/archive/master.zip')
			.reply(200, {});

		ghScope.get('/user/manifestTest/archive/master.zip')
			.replyWithFile(200, __dirname + '/resources/manifestTest/master.zip');

		ghScope.get('/user/manifestTestNoApp/archive/master.zip')
				.replyWithFile(200, __dirname + '/resources/manifestTestNoApp/master.zip');
	}
};
