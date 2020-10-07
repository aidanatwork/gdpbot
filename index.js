require('dotenv').config()
const { App } = require('@slack/bolt');
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;
const fbtoken = process.env.FOGBUGZ_TOKEN

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Listens to incoming messages that mention a case number in "case XXXX" format.
app.message(/case\s[0-9]+/gim, async ({ message, context, say }) => {

  var case_links = '';
  var mLen = context.matches.length;
  var case_numbers = [];

  for (i = 0; i < mLen; i++) {
    case_number = context.matches[i].split(" ")[1]
    case_title = ''
    case_category = ''
    case_icon = ''

    if (case_numbers.includes(case_number)) {
      continue
    }
    else {
      case_numbers.push(case_number)
    
      await fetch(`https://mhk.thunderheadeng.net/fogbugz/api.asp?token=${fbtoken}&cmd=search&cols=sTitle,sCategory&q=${case_number}`)
        .then(res => res.text())
        .then(body => parseString(body, function (err, result) {
          //console.dir(result,{depth: null})
          if ( result.response.cases[0].$.count != '0' ) {
            case_title = result.response.cases[0].case[0].sTitle[0]
            case_category = result.response.cases[0].case[0].sCategory[0]
          }        
        }));

        if(case_category == 'Inquiry') {
          case_icon = ':incoming_envelope:'
        }
        else if(case_category == 'Bug') {
          case_icon = ':beetle:'
        }
        else if(case_category == 'Feature') {
          case_icon = ':bulb:'
        }
      
      if (case_title != '') {
        case_links += `<https://mhk.thunderheadeng.net/fogbugz/default.asp?${case_number}|${case_icon}${case_number}: '${case_title}'>, `
      }
      else {
        case_links += `~${case_number}: N/A~, `
      } 
    }
  }

  await say({
    blocks: [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `See case(s) ${case_links}that <@${message.user}> mentioned.`
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
app.command('/case', async ({ command, ack, say }) => {
  await ack();
  await say(`Case Link: <https://mhk.thunderheadeng.net/fogbugz/default.asp?${command.text}|${command.text}>`);
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
        "callback_id": "case-reference",
        "title": {
          "type": "plain_text",
          "text": "FogBugz Case Reference",
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
              "text": "Please enter information below for the case to reference.",
              "emoji": true
            }
          },
          {
            "type": "input",
            "block_id": "case-number",
            "element": {
              "type": "plain_text_input",
              "action_id": "case-value"
            },
            "label": {
              "type": "plain_text",
              "text": "Case Number",
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
              "text": "Why are you linking to this case?",
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

app.view('case-reference', async ({ ack, body, view, context }) => {
  await ack();

  const case_number = view['state']['values']['case-number']['case-value']['value'];
  const reason = view['state']['values']['reason']['reason-value']['value'];
  const user = body['user']['id'];
  const conversation = view['state']['values']['channel_select']['channel_selection']['selected_conversation'];
  const selected_friends = view['state']['values']['notification']['notification-value']['selected_users'];

  var notify = ''
  let fLen = selected_friends.length;

  for (i = 0; i < fLen; i++) {
    notify += `<@${selected_friends[i]}> `
  }

  let msg = `FogBugz: <https://mhk.thunderheadeng.net/fogbugz/default.asp?${case_number}|${case_number}>, "${reason}" - To: ${notify} From: <@${user}>`;

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