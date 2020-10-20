require('dotenv').config()
const { App } = require('@slack/bolt');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;
const fbtoken = process.env.FOGBUGZ_TOKEN
const api_domain = process.env.GIT_DOMAIN
const api_owner = process.env.GIT_OWNER


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
    
      await fetch(`https://mhk.thunderheadeng.net/fogbugz/api.asp?token=${fbtoken}&cmd=search&cols=sTitle,sCategory&q=${issue_number}`)
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

/* app.event('reaction_added', async ({ event, say }) => {
  if (event.reaction === 'calendar') {
    await say({
      blocks: [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Pick a date for me to remind you"
        },
        "accessory": {
          "type": "datepicker",
          "action_id": "datepicker_remind",
          "initial_date": curday('-'),
          "placeholder": {
            "type": "plain_text",
            "text": "Select a date"
          }
        }
      }]
    });
  }
}); */

/* app.action('datepicker_remind', async ({ body, ack, say }) => {
  await ack();
  await say(`Date Selected 👍`);
}); */

// The echo command simply echoes on command
app.command('/issue', async ({ command, ack, say }) => {
  await ack();
  await say(`Issue Link: <https://mhk.thunderheadeng.net/fogbugz/default.asp?${command.text}|${command.text}>`);
});

// Listen for a slash command invocation
app.shortcut('fbcase', async ({ ack, body, context }) => {
  await ack();

  try {
    const result = await app.client.views.open({
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        "type": "modal",
        "callback_id": "issue-reference",
        "title": {
          "type": "plain_text",
          "text": "GitHub Issue Reference",
          "emoji": true
        },
        "submit": {
          "type": "plain_text",
          "text": "Submit",
          "emoji": true
        },
        "close": {
          "type": "plain_text",
          "text": "Cancel",
          "emoji": true
        },
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "plain_text",
              "text": "Please enter information below for the issue to reference.",
              "emoji": true
            }
          },
          {
            "type": "input",
            "block_id": "issue-number",
            "element": {
              "type": "plain_text_input",
              "action_id": "issue-value"
            },
            "label": {
              "type": "plain_text",
              "text": "Issue Number",
              "emoji": true
            }
          },
          {
            "type": "input",
            "block_id": "notification",
            "element": {
              "type": "multi_users_select",
              "action_id": "notification-value",
              "placeholder": {
                "type": "plain_text",
                "text": "Select users",
                "emoji": true
              }
            },
            "label": {
              "type": "plain_text",
              "text": "Select friend(s)",
              "emoji": true
            }
          },
          {
            "type": "input",
            "block_id": "reason",
            "element": {
              "type": "plain_text_input",
              "action_id": "reason-value",
              "multiline": true
            },
            "label": {
              "type": "plain_text",
              "text": "Why are you linking to this issue?",
              "emoji": true
            }
          },
          {
            "block_id": "channel_select",
            "type": "input",
            "optional": true,
            "label": {
              "type": "plain_text",
              "text": "Select a channel to post the result in"
            },
            "element": {
              "action_id": "channel_selection",
              "type": "conversations_select",
              "response_url_enabled": true,
              "default_to_current_conversation": true,
            },
          },
        ]
      }
    });
  }
  catch (error) {
    console.error(error);
  }
});

app.view('issue-reference', async ({ ack, body, view, context }) => {
  await ack();

  const issue_number = view['state']['values']['issue-number']['issue-value']['value'];
  const reason = view['state']['values']['reason']['reason-value']['value'];
  const user = body['user']['id'];
  const conversation = view['state']['values']['channel_select']['channel_selection']['selected_conversation'];
  const selected_friends = view['state']['values']['notification']['notification-value']['selected_users'];

  var notify = ''
  let fLen = selected_friends.length;

  for (i = 0; i < fLen; i++) {
    notify += `<@${selected_friends[i]}> `
  }

  let msg = `FogBugz: <https://mhk.thunderheadeng.net/fogbugz/default.asp?${issue_number}|${issue_number}>, "${reason}" - To: ${notify} From: <@${user}>`;

  // Message the channel
  try {
    await app.client.chat.postMessage({
      token: context.botToken,
      channel: conversation,
      text: msg
    });
  }
  catch (error) {
    console.error(error);
  }

  //console.log(`View Data:${JSON.stringify(view)}`)

});

var curday = function(sp){
  today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //As January is 0.
  var yyyy = today.getFullYear();
  
  if(dd<10) dd='0'+dd;
  if(mm<10) mm='0'+mm;
  return (yyyy+sp+mm+sp+dd);
};

(async () => {
  // Start your app
  await app.start(process.env.PORT || 8080);

  console.log('⚡️ GDP SlackBot is running!');
})();