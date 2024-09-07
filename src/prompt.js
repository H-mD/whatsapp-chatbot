const {OpenAIClient, AzureKeyCredential} = require("@azure/openai");
require("dotenv").config();
const fs = require('fs');

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentId = process.env.AZURE_OPENAI_MODEL;

function saveChats(jid, messages) {
    const jsonString = JSON.stringify(messages, null, 2);
    fs.writeFileSync('chats/' + jid + '.json', jsonString);
}

function loadChats(jid) {
    return JSON.parse(fs.readFileSync('chats/' + jid + '.json', 'utf8'));
}

function isSession(jid) {
    return fs.existsSync('chats/' + jid + '.json');
}

class botSession {
    constructor(jid) {
        this.jid = jid;
        this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
        if (!isSession(jid)) {
          const context = [
              { role: "system", content: process.env.MODEL_CONTEXT },
          ];
          saveChats(jid, context);
        }
    }

    async getprompt(message) {
        const messages = loadChats(this.jid);
        messages.push({ role: "user", content: message });
        try {
            const events = await this.client.streamChatCompletions(deploymentId, messages);
            let response = [];
            for await (const event of events) {
              for (const choice of event.choices) {
                const delta = choice.delta?.content;
                if (delta !== undefined) {
                  response.push(delta);
                }
              }
            }
            messages.push({ role: "assistant", content: response.join('') });
            saveChats(this.jid, messages);
            return response;
        } catch (err){
            console.error("The sample encountered an error:", err);
        }
    }

}

module.exports = { botSession };