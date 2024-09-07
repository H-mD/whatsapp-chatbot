const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { DisconnectReason, useMultiFileAuthState, BrowsersMap } = baileys;
const { botSession } = require("./prompt");
const { json } = require('express');

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    const sock = makeWASocket({
        // browser: BrowsersMap.windows('Desktop'),
        syncFullHistory: true,
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr} = update || {};

        if(qr) {
            console.log('QR RECEIVED', qr);
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statuscode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = JSON.parse(JSON.stringify(m, undefined, 2));
            const message = msg.messages[0].message.conversation || msg.messages[0].message.extendedTextMessage.text;
            const user = msg.messages[0].pushName;
            const jid = msg.messages[0].key.remoteJid;

            if (!message) {
                console.log('ignoring empty message');
                return;
            }

            if (msg.messages[0].key.fromMe) return;

            if (message == "/deactivate") {
                await sock.sendMessage(jid, { text: '[system] good bye!!' });
                process.exit();
            }

            console.log(`chat: {${user}: ${message}} `);

            if (message.startsWith("/chat")) {
                const session = new botSession(jid);
                console.log('processing prompt...');
                const fixmessage = message.substring(6);
                let response = await session.getprompt(fixmessage);
                response = response.join('');
                console.log('"""\n' + response + '\n"""');
                console.log('sending response...');
                await sock.sendMessage(jid, { text: "[system] " + response });    
            }
        }
        catch (err) {
            console.log('error: ', err);
        }
    });

    sock.ev.on ('creds.update', saveCreds);
}

connectToWhatsApp()