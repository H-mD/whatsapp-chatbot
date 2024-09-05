const {OpenAIClient, AzureKeyCredential} = require("@azure/openai");
require("dotenv").config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentId = process.env.AZURE_OPENAI_MODEL;

class botSession {
    constructor() {
        this.messages = [
            { role: "system", content: process.env.MODEL_CONTEXT },
        ];
        this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
    }

    async getprompt(message) {
        this.messages.push({ role: "user", content: message });
        try {
            const events = await this.client.streamChatCompletions(deploymentId, this.messages);
            let response = [];
            for await (const event of events) {
              for (const choice of event.choices) {
                const delta = choice.delta?.content;
                if (delta !== undefined) {
                  response.push(delta);
                }
              }
            }
            this.messages.push({ role: "assistant", content: response.join('') });
            return response;
        } catch (err){
            console.error("The sample encountered an error:", err);
        }
    }

}

module.exports = { botSession };