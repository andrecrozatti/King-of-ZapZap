const { Client, Location, List, Buttons, LocalAuth, MessageMedia } = require('whatsapp-web.js');
//const {Util} = require('whatsapp-web.js') 
var qrcode = require('qrcode-terminal');
const Util = require('./whatsapp-web.js/src/util/Util');
const express = require('express')
const app = express()
const port = 3000



const iniciaChat = (id, figurinha) => {
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: id
        }),
        puppeteer: { headless: true }
    });
    client.initialize();




    client.on('qr', (qr) => {
        // NOTE: This event will not be fired if a session is specified.
        qrcode.generate(qr, { small: true });
        console.log('QR RECEIVED', qr);
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
    });

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('ready', async () => {
        console.log('READY');
    });

    client.on('change_state', state => {
        console.log('CHANGE STATE', state);
    });

    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
    });


    //#region 
    client.on('message', async msg => {
        console.log('MESSAGE RECEIVED', msg);

        if (msg.body === '!ping reply') {
            // Send a new message as a reply to the current one
            msg.reply('pong');

        } else if (msg.body === '!ping') {
            // Send a new message to the same chat
            client.sendMessage(msg.from, 'pong');

        } else if (msg.body.startsWith('!sendto ')) {
            // Direct send a new message to specific id
            let number = msg.body.split(' ')[1];
            let messageIndex = msg.body.indexOf(number) + number.length;
            let message = msg.body.slice(messageIndex, msg.body.length);
            number = number.includes('@c.us') ? number : `${number}@c.us`;
            let chat = await msg.getChat();
            chat.sendSeen();
            client.sendMessage(number, message);

        } else if (msg.body.startsWith('!subject ')) {
            // Change the group subject
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newSubject = msg.body.slice(9);
                chat.setSubject(newSubject);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith('!echo ')) {
            // Replies with the same message
            msg.reply(msg.body.slice(6));
        } else if (msg.body.startsWith('!desc ')) {
            // Change the group description
            let chat = await msg.getChat();
            if (chat.isGroup) {
                let newDescription = msg.body.slice(6);
                chat.setDescription(newDescription);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === '!leave') {
            // Leave the group
            let chat = await msg.getChat();
            if (chat.isGroup) {
                chat.leave();
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body.startsWith('!join ')) {
            const inviteCode = msg.body.split(' ')[1];
            try {
                await client.acceptInvite(inviteCode);
                msg.reply('Joined the group!');
            } catch (e) {
                msg.reply('That invite code seems to be invalid.');
            }
        } else if (msg.body === '!groupinfo') {
            let chat = await msg.getChat();
            if (chat.isGroup) {
                msg.reply(`
                        *Group Details*
                        Name: ${chat.name}
                        Description: ${chat.description}
                        Created At: ${chat.createdAt.toString()}
                        Created By: ${chat.owner.user}
                        Participant count: ${chat.participants.length}
                    `);
            } else {
                msg.reply('This command can only be used in a group!');
            }
        } else if (msg.body === '!chats') {
            const chats = await client.getChats();
            client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        } else if (msg.body === '!info') {
            let info = client.info;
            client.sendMessage(msg.from, `
                    *Connection info*
                    User name: ${info.pushname}
                    My number: ${info.wid.user}
                    Platform: ${info.platform}
                `);
        } else if (msg.body === '!mediainfo' && msg.hasMedia) {
            const attachmentData = await msg.downloadMedia();
            msg.reply(`
                    *Media info*
                    MimeType: ${attachmentData.mimetype}
                    Filename: ${attachmentData.filename}
                    Data (length): ${attachmentData.data.length}
                `);
        } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();

            quotedMsg.reply(`
                    ID: ${quotedMsg.id._serialized}
                    Type: ${quotedMsg.type}
                    Author: ${quotedMsg.author || quotedMsg.from}
                    Timestamp: ${quotedMsg.timestamp}
                    Has Media? ${quotedMsg.hasMedia}
                `);
        } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const attachmentData = await quotedMsg.downloadMedia();
                client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
            }
        } else if (msg.body === '!location') {
            msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
        } else if (msg.location) {
            msg.reply(msg.location);
        } else if (msg.body.startsWith('!status ')) {
            const newStatus = msg.body.split(' ')[1];
            await client.setStatus(newStatus);
            msg.reply(`Status was updated to *${newStatus}*`);
        } else if (msg.body === '!mention') {
            const contact = await msg.getContact();
            const chat = await msg.getChat();
            chat.sendMessage(`Hi @${contact.number}!`, {
                mentions: [contact]
            });
        } else if (msg.body === '!delete') {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.fromMe) {
                    quotedMsg.delete(true);
                } else {
                    msg.reply('I can only delete my own messages');
                }
            }
        } else if (msg.body === '!pin') {
            const chat = await msg.getChat();
            await chat.pin();
        } else if (msg.body === '!archive') {
            const chat = await msg.getChat();
            await chat.archive();
        } else if (msg.body === '!mute') {
            const chat = await msg.getChat();
            // mute the chat for 20 seconds
            const unmuteDate = new Date();
            unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
            await chat.mute(unmuteDate);
        } else if (msg.body === '!typing') {
            const chat = await msg.getChat();
            // simulates typing in the chat
            chat.sendStateTyping();
        } else if (msg.body === '!recording') {
            const chat = await msg.getChat();
            // simulates recording audio in the chat
            chat.sendStateRecording();
        } else if (msg.body === '!clearstate') {
            const chat = await msg.getChat();
            // stops typing or recording in the chat
            chat.clearState();
        } else if (msg.body === '!jumpto') {
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                client.interface.openChatWindowAt(quotedMsg.id._serialized);
            }
        } else if (msg.body === '!buttons') {
            let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
            client.sendMessage(msg.from, button);
        } else if (msg.body === '!list') {
            let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
            let list = new List('List body', 'btnText', sections, 'Title', 'footer');
            client.sendMessage(msg.from, list);
        }
    });
    //#endregion

    app.get('/message', (req, res) => {
        enviaImagem()
        res.send('Imagem Enviada')
    })
    async function enviaFigurinha() {
        //const fig = client.Util.formatImageToWebpSticker("sdadsadas");
        var base64 = "data:image/webp;base64,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"
        var messageMedia = new MessageMedia('data:image/webp', base64)
        const fig = Util.formatImageToWebpSticker(messageMedia)
        return fig

    }

    async function enviaImagem() {
        //var figurinha = await enviaFigurinha();
        var media = await MessageMedia.fromUrl('https://via.placeholder.com/350x150.png');
        await client.sendMessage('number', media,{
            sendMediaAsSticker:true
        });
        
    }

}

app.get('/', (req, res) => {
    iniciaChat()
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


