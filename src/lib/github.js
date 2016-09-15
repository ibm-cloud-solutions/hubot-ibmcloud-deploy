
/*
  * Licensed Materials - Property of IBM
  * (C) Copyright IBM Corp. 2016. All Rights Reserved.
  * US Government Users Restricted Rights - Use, duplication or
  * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
  */
'use strict';

const Github = require('github');

const gh = new Github({
	version: '3.0.0',
	host: process.env.HUBOT_GITHUB_DOMAIN || 'api.github.com'
});

if (process.env.HUBOT_GITHUB_TOKEN) {
	gh.authenticate({
		type: 'token',
		token: process.env.HUBOT_GITHUB_TOKEN
	});
}

module.exports = gh;
