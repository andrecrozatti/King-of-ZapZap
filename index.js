const { Client, Location, List, Buttons, LocalAuth, MessageMedia } = require('whatsapp-web.js');
//const {Util} = require('whatsapp-web.js') 
var qrcode = require('qrcode-terminal');
const Util = require('./whatsapp-web.js/src/util/Util');
const express = require('express')
const app = express()
const fs = require("fs")
const sharp = require("sharp")
app.use(express.urlencoded({extended: true}))
const port = 3000



const iniciaChat = async (id, figurinha) => {
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
            var a = msg
            ajustarImagem(a._data.body)

            var media = new MessageMedia(a._data.mimetype, a._data.body)
            client.sendMessage(msg.from, media, {
                sendMediaAsSticker:true
            });

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

    
    app.post('/message', async (req, res) => {
        enviaImagem(req.body.base64)
        //console.log(req.body)
        res.send('Imagem Enviada')
    })

    async function enviaFigurinha(base64, mime) {
        //const fig = client.Util.formatImageToWebpSticker("sdadsadas");
       
        var messageMedia = new MessageMedia(mime, base64)
        const fig = Util.formatImageToWebpSticker(messageMedia)
        return fig

    }

    async function enviaImagem(base64) {
        //var media = await MessageMedia.fromUrl('https://via.placeholder.com/350x150.png');
        
        

        // var mime = base64.substring(base64.indexOf(":")+1,base64.indexOf(";"))
        // var media = await enviaFigurinha(base64.substring(base64.indexOf(",") + 1), mime)
        const base64data = ajustarImagem(base64)
        var mime = 'image/webp'
        var media = await enviaFigurinha(base64data, mime)

        await client.sendMessage('5519992942394@c.us', media, {
            sendMediaAsSticker: true
        });

    }

    async function ajustarImagem(base64) {
        let buff
        if (base64.indexOf(",")) {
            buff = new Buffer.from(base64.substring(base64.indexOf(",") + 1), 'base64');
        }else{
            buff = new Buffer.from(base64, 'base64');
        }   
        
        fs.writeFileSync('fig.webp', buff);
        await sharp('fig.webp')
        .clone()
        .resize({width:512, height:512})
        .toFile('./fig_convertida.webp')
        .then((info)=>{
            console.log(info)
        })
        .catch(err => {
            console.log(err)
        })

        buff = fs.readFileSync('fig_convertida.webp');
        return buff.toString('base64');
    }

}

app.get('/', async (req, res) => {
    await iniciaChat()
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

    
