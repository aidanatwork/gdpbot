const dotenv = require('dotenv');
dotenv.config();
//TODO - check if 'http' package can be safely removed here
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
// TODO: refactor so we don't need to use 'request'. It's deprecated.
const request = require('request');
const axios = require('axios');
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const issuesDomain = process.env.GIT_ISSUES_DOMAIN;
const apiDomain = process.env.GIT_API_DOMAIN;
const gitUser = process.env.GIT_USER;
const gitPwd = process.env.GIT_PWD;
const owner = process.env.GIT_OWNER;
const repos = process.env.GIT_REPOS;
const PORT = process.env.PORT;
const botToken = process.env.SLACK_BOT_TOKEN;
const issueRegex = /\b[\S]+?\b\sissue\s[0-9]+/gim;
const linkRegex = /\<.+?\>/gim;

const createBasicAuth = function (user,pwd) {
  let str = user + ':' + pwd;
  let buff = Buffer.from(str, 'utf-8');
  let base64 = buff.toString('base64');
  return base64;
};

//TODO - automatically add this bot to any new channel that is created

//TODO - check if the link to GitHub is actually valid before adding it to reply
//create issue link
const createIssueLink = function(repo, issueNumber) {
  return issuesDomain + "/" + owner + "/" + repo + "/issues/" + issueNumber;
};
//strip out links from Slack message text
const stripOutLinks = function(text) {
  var new_text = text;
  if (linkRegex.test(text)) {
    text.match(linkRegex).forEach(function(item){
      let edited_item = item.substring(1, item.length - 1);
      edited_item = edited_item.split("|")[1]
      new_text = new_text.replace(item,edited_item);
    });
  }
  return new_text;
};

//create issue link text
//TODO - change this so the repo name gets pulled out of 'item' and passed to createIssueLink. Maybe map shorthand names to the longer repo names.
const createIssueLinksText = function (msg_text) {
  let new_msg = '';
  msg_text.match(issueRegex).forEach(function(item) {
    let itemArray = item.split("issue");
    let issueNumber = itemArray[1].trim();
    let issueRepo = itemArray[0].trim();
    let newLink = createIssueLink(issueRepo, issueNumber);
    new_msg += 'See GitHub <' + newLink + '|' + item + '> that was just mentioned.\n';
  });
  return new_msg;
};

//send reply to issue mention
//TODO - convert part of match that is hyperlink to just text of the link
const replyWithIssue = function(msg_text, channel) {
  let new_msg_text = createIssueLinksText(msg_text);
  let new_msg = {
    "channel":channel,
    "text":new_msg_text
  };
  let config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + botToken
    }
  };
  axios
    .post('https://slack.com/api/chat.postMessage', new_msg, config)
    .then(function (response) {
      //console.log('Response:');
      //console.log(response);
    })
    .catch(function (error) {
      console.error(error);
    });
};

// create auth string for GitHub
const basicAuth = 'Basic ' + createBasicAuth(gitUser, gitPwd);

// instantiate and configure Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Body parser use JSON data

// Start the server
app.listen(PORT, function () {
  console.log("App is listening on port " + PORT);
});

// handle health check for app (not through Slack)
app.get('/', function(req, res) {
  res.send('GDP Bot is working! Path Hit: ' + req.url);
});
// Handle request to /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function(req, res) {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500);
    res.send({"Error": "Looks like we're not getting code."});
    console.log("Looks like we're not getting code.");
  } else {
    // If it's there...

    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request({
      url: 'https://slack.com/api/oauth.access', //URL to hit
      qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
      method: 'GET', //Specify the method

    }, function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        res.json(body);
      }
    })
  }
});
// Handle /hellobot slash command to test that app is connected to Slack
app.post('/command', function(req, res) {
  console.log('someone said hi');
  res.send('Hello! I\'m the GDP Bot.');
});

//Provide a GitHub link when an issue is mentioned with the /issue slash command in a channel.
app.post('/create', function(req, res) {
  console.log('/create command was received');
  res.sendStatus(200);
  let msg = req.body;
  console.log('msg: ' + JSON.stringify(msg));
  let msg_text = stripOutLinks(msg.text).trim();
  let split_msg = msg_text.split("|");
  let repo = split_msg[0].trim();
  let title = split_msg[1].trim();
  let body = split_msg[2].trim();
  let url = apiDomain + "/repos/" + owner + "/" + repo + "/issues";
  console.log('url: ' + url);
  let data = {
    "title": title,
    "body": body
  };
  let config = {
    headers: {
      'Authorization': basicAuth,
      'Content-Type': 'application/vnd.github.v3+json'
    }
  };
  axios
    .post(url, data, config)
    .then(function (response) {
      console.log('Response:');
      console.log(response);
    })
    .catch(function (error) {
      console.error(error);
    });
  let channel = msg.channel_id;
  /*if (issueRegex.test(msg_text)) {
    replyWithIssue(msg_text, channel);
  }*/
});

// TODO - fix so this can reply to mentions in private channels. right now only works for public channels.
// This route listens for "issue" in a message, and if it is followed by a number, brings in the GitHub link for that issue.
app.post('/message', function(req, res){
  //console.log('A message was received');
  res.sendStatus(200);
  if (req.body.event.bot_profile && req.body.event.bot_profile.name == "gdpbot") {
  } else {
    let msg = req.body;
    //console.log('msg: ' + JSON.stringify(msg));
    let msg_text = msg.event.text;
    msg_text = stripOutLinks(msg_text);
    let channel = msg.event.channel;
    if (issueRegex.test(msg_text)) {
      replyWithIssue(msg_text, channel);
    }
  }
});