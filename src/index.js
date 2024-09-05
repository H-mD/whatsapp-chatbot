const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { DisconnectReason, useMultiFileAuthState, BrowsersMap } = baileys;
const { botSession } = require("./prompt");

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    console.log('initializing prompt session...');
    const session = new botSession();

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
            const message = msg.messages[0].message.conversation;
            const user = msg.messages[0].message.pushName;

            if (!message) {
                console.log('ignoring empty message');
                return;
            }

            if (msg.messages[0].key.fromMe) return;

            if (message == "/deactivate") {
                await sock.sendMessage(msg.messages[0].key.remoteJid, { text: '[system] good bye!!' });
                process.exit();
            }

            console.log(`{${user}: ${message}} `);

            if (message.startsWith("/chat")) {
                console.log('processing prompt...');
                const fixmessage = message.substring(6);
                const response = await session.getprompt(fixmessage);
                console.log('sending response...');
                console.log(session.messages);
                await sock.sendMessage(msg.messages[0].key.remoteJid, { text: "[system] " + response.join('') });    
            }
        }
        catch (err) {
            console.log('error: ', err);
        }
    });

    sock.ev.on ('creds.update', saveCreds);
}

connectToWhatsApp()