require('dotenv').config()
const { App } = require('@slack/bolt');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;
const fbtoken = process.env.FOGBUGZ_TOKEN
const domain = process.env.GIT_DOMAIN
const owner = process.env.GIT_OWNER
const repos = process.env.GIT_REPOS


// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Listens to incoming messages that mention an issue number in "issue XXXX" format.
app.message(/issue\s[0-9]+/gim, async ({ message, context, say }) => {

  var issue_links = '';
  var mLen = context.matches.length;
  var issue_numbers = [];

  for (i = 0; i < mLen; i++) {
    issue_number = context.matches[i].split(" ")[1]
    issue_title = ''
    issue_category = ''

    if (issue_numbers.includes(issue_number)) {
      continue
    }
    else {
      issue_numbers.push(issue_number)

      await fetch(`${domain}/repos/${owner}/${repos[0]}/issues/${issue_number}`)
        .then(res => res.text())
        .then(body => parseString(body, function (err, result) {
          //console.dir(result,{depth: null})
          if ( result.response.issues[0].$.count != '0' ) {
            issue_title = result.response.issues[0].issue[0].sTitle[0]
            issue_category = result.response.issues[0].issue[0].sCategory[0]
          }
        }));

      if (issue_title != '') {
        issue_links += `<https://mhk.thunderheadeng.net/fogbugz/default.asp?${issue_number}|${issue_number}: '${issue_title}'>, `
      }
      else {
        issue_links += `~${issue_number}: N/A~, `
      }
    }
  }

  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `See issue(s) ${issue_links}that <@${message.user}> mentioned.`
        }
      }
    ]
  });
});