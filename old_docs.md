<<<<<<< HEAD
# gdpbot
A bot connecting Good Docs Project Slack to GitHub
=======
## Local Setup
1. Install [node.js and npm](https://nodejs.org/en/) (usually in same installer)
2. Install (copy) [ngrok](https://ngrok.com/)
3. Clone [GitLab Repository](https://gitlab.com/thunderheadeng/web/thunderbot.git) for the production app.
4. Join Slack "TECi Dev Workspace"
5. Terminal 1 - Run your application locally in node.
6. Terminal 2 - Start ngrok on that folder and use the URL in the next step.  
You can use your ngrok subdomain like this: `ngrok http -subdomain=bryanbot 8080`
7. Create your own development 'App' in the Slack Dev Workspace (ex. "Bryan Bot")
8. Set all the endpoint URLs in the Slack App to your ngrok URL follwed by `/slack/events`  
Ex. `https://XXXXXXXXXX.ngrok.com/slack/events`
9. Add your app to a Slack Channel and test a known message, action, event for the bot and make sure it responds as expected.
You would setup your own 'app' in the dev workspace and test your local version of the code running through ngrok.
### Initial Slack App Setup and Redirect URL locations
1. Features -> OAuth & Permissions  
     a. Add Bot Token Scopes (as listed in the main app if you haven't already)  
2. Features -> Interactivity & Shortcuts (enable toggle)  
     a. Add URL from ngrok + "/slack/events" to Request URL textbox  
     b. Save changes  
3. Features -> Slash Commands  
     a. Add slash commands for any slash commands listed in the code  
     b. Add URL from ngrok + "/slack/events" to request URL textbox  
     c. Update any existing slash commands to the new request URL  
4. Features -> Event Subscriptions (enable toggle)  
     a. Add URL from ngrok + "/slack/events" to Request URL textbox  
     b. Subscribe to bot events (as listed in the main app if you haven't already)  
     c. Save changes  
>>>>>>> initial commit
