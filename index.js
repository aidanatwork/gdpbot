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
const owner = process.env.GIT_OWNER;
const repos = process.env.GIT_REPOS;
const PORT = process.env.PORT;
const botToken = process.env.SLACK_BOT_TOKEN;
const issueRegex = /issue\s[0-9]+/gim;

//TODO - automatically add this bot to any new channel that is created

//TODO - check if the link to GitHub is actually valid before adding it to reply
//create issue link
const createIssueLink = function(repo, issueNumber) {
  var newLink = issuesDomain + "/" + owner + "/" + repo + "/issues/" + issueNumber;
  return newLink;
};
//create issue link text
//TODO - change this so it determines the repo name based on which channel it is in.
const createIssueLinksText = function (msg_text) {
  /*return msg_text.replace(issueRegex, function (match) {
    var issueNumber = match.split(" ")[1];
    var newLink = createIssueLink('templates', issueNumber);
    return 'See GitHub <' + newLink + '|' + match + '> that was just mentioned.';
  });*/
  let new_msg = '';
  msg_text.match(issueRegex).forEach(function(item) {
    let issueNumber = item.split(" ")[1];
    let newLink = createIssueLink('templates', issueNumber);
    new_msg += 'See GitHub <' + newLink + '|' + item + '> that was just mentioned.\n';
  });
  return new_msg;
};

//send reply to issue mention
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
/*app.post('/issue', function(req, res) {
  console.log('/issue command was received');
  res.sendStatus(200);
  var msg = req.body;
  var msg_text = msg.text;
  var channel = msg.channel_id;
  if (issueRegex.test(msg_text)) {
    replyWithIssue(msg_text, channel);
  }
});*/

// TODO - fix so this can reply to mentions in private channels. right now only works for public channels.
// This route listens for "issue" in a message, and if it is followed by a number, brings in the GitHub link for that issue.
app.post('/message', function(req, res){
  //console.log('A message was received');
  res.sendStatus(200);
  if (req.body.event.bot_profile && req.body.event.bot_profile.name == "gdpbot") {
  } else {
    let msg = req.body;
    //console.log('msg: ' + JSON.stringify(msg));
    let msg_text = msg.event.blocks[0].elements[0].elements[0].text;
    let channel = msg.event.channel;
    if (issueRegex.test(msg_text)) {
      replyWithIssue(msg_text, channel);
    }
  }
});