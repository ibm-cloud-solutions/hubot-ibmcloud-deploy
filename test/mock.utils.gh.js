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


	}
};
