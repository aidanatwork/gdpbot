const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const issuesDomain = "https://github.com";
const owner = "thegooddocsproject";
const port = process.env.PORT || 4390;
const botToken = process.env.SLACK_BOT_TOKEN;
const issueRegex = /\b[\S]+?\b\sissue\s[0-9]+/gim;
const linkRegex = /\<.+?\>/gim;

const createIssueLink = function(repo, issueNumber) {
  return issuesDomain + "/" + owner + "/" + repo + "/issues/" + issueNumber;
};

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

// start the server
app.listen(port, function () {
  console.log("App is listening on port " + port);
});

// handle health check for app (through browser, not through Slack)
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
    let config = {
      params: {
        code: req.query.code,
        client_id: clientId,
        client_secret: clientSecret
      }
    };
    // If it's there, we'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    axios
      .get('https://slack.com/api/oauth.access', config)
      .then(function (response) {
        console.log('Response:');
        console.log(response);
      })
      .catch(function (error) {
        console.error(error);
      });
  }
});
// Handle /hellobot slash command to test that app is connected to Slack
app.post('/command', function(req, res) {
  //console.log('someone said hi');
  res.send('Hello! I\'m the GDP Bot.');
});

// This route listens for "issue" in a message, and if it is followed by a number, brings in the GitHub link for that issue.
app.post('/message', function(req, res){
  /* Use these statements for troubleshooting. */
  //console.log('A message was received');
  console.log('\nreq.body: ' + JSON.stringify(req.body) + '\n');
  if (req.body.challenge) {
    res.status(200).send(req.body.challenge); // use this when Slack is verifying a new callback URL for events
    /*} else if ( req.body.event.bot_profile && req.body.event.bot_profile.name === "gdpbot") {
    } else if (req.body.event.message && req.body.event.message.bot_profile && req.body.event.message.bot_profile.name === "gdpbot") {*/
  } else if ( ( req.body.event && req.body.event.hasOwnProperty(bot_profile) ) || ( req.body.event.message && req.body.event.message.hasOwnProperty(bot_profile) ) ) {
    console.log('\nthis is from a bot\n');
  } else {
    let msg = req.body;
    let msg_text = msg.event.text;
    msg_text = stripOutLinks(msg_text);
    let channel = msg.event.channel;
    if (issueRegex.test(msg_text)) {
      replyWithIssue(msg_text, channel);
    }
  }
});