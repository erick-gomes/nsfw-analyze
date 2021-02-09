import { Readable } from 'stream'
import tf from '@tensorflow/tfjs-node'
import Ffmpeg from 'fluent-ffmpeg'
import qrcode from 'qrcode-terminal'
import wppWeb from 'whatsapp-web.js'
import * as nsfwjs from 'nsfwjs'

/*
* Config
*/
const client = new wppWeb.Client({
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox'
        ]
    }
})

client.initialize()

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true })
})

client.on('ready', async () => {
    console.log('O bot está farejando!')
})

client.on('message', async (msg) => {
    // Verifição de mídia
    const chat = msg.getChat()
    const contact = msg.getContact()
    if (contact === msg.to) { return }
    if (msg.hasMedia) {
        let mediaAnalyze = await msg.downloadMedia()
        if (mediaAnalyze.mimetype !== 'image/jpeg') {
            if (mediaAnalyze.mimetype !== 'video/mp4') {
                if (mediaAnalyze.mimetype !== 'image/png') {
                    return
                }
            }
        }
        if (mediaAnalyze.mimetype === 'video/mp4') {
            const videoBuffer = Buffer.from(mediaAnalyze.data, 'base64')
            /**
            * Convert a buffer to a stream
            *
            * @param binary Buffer
            * @returns Readable
            */
            function bufferToStream (binary) {
                return new Readable({
                    read () {
                        this.push(binary)
                        this.push(null)
                    }
                })
            }
            const streamVideo = bufferToStream(videoBuffer)
            const proc = new Ffmpeg({ source: streamVideo })

            proc.saveToFile('./framesAnalyze.gif', (stdout, stderr) => {
                if (stderr) {
                    return msg.reply(`Ocorreu um erro.\n${stderr}`)
                }
                console.log('finish', stdout)
            })
            proc.on('end', async () => {
                mediaAnalyze = wppWeb.MessageMedia.fromFilePath('./framesAnalyze.gif')
                const modelGif = await nsfwjs.load()
                function analyzeBuffer () {
                    try {
                        const bufferAnalyze = Buffer.from(mediaAnalyze.data, 'base64')
                        return bufferAnalyze
                    } catch (error) {
                        msg.reply('Vídeo grande detectado,  alertando os adms...')
                        return false
                    }
                }
                const myBufferGif = analyzeBuffer()
                if (myBufferGif === false) {
                    const mentions = []
                    let text = 'Ameaça detectada, o que deseja fazer?\n'
                    for (const p of chat.participants) {
                        if (p.isAdmin) {
                            const contactId = await client.getContactById(p.id._serialized)
                            mentions.push(contactId)
                            text += `@${p.id.user} `
                        }
                    }
                    chat.sendMessage(text, { mentions }).then(() => console.log('Vídeo grande detectado.'))
                    return
                }
                const myConfig = {
                    topk: 3,
                    fps: 1
                }
                const predictions = await modelGif.classifyGif(myBufferGif, myConfig)
                console.log(predictions)
                for (const pre of predictions) {
                    switch (pre[0].className) {
                    case 'Neutral':
                        if (Math.round(pre[1].probability * 100) > 20 && pre[1].className === 'Porn') {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Conteúdo hentai detectado, tomando as devidas providências...')
                            })
                            return
                        } else if (Math.round(pre[1].probability * 100) > 20 && pre[1].className === 'Hentai') {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Conteúdo hentai detectado, tomando as devidas providências...')
                            })
                            return
                        } else if (Math.round(pre[1].probability * 100) > 20 && pre[1].className === 'Sexy') {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Conteúdo hentai detectado, tomando as devidas providências...')
                            })
                            return
                        }
                        break
                    case 'Hentai':
                        if (Math.round(pre[0].probability * 100) > 40) {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Conteúdo hentai detectado, tomando as devidas providências...')
                            })
                            return
                        }
                        break
                    case 'Porn':
                        if (Math.round(pre[0].probability * 100) > 80) {
                            msg.reply('Seu conteúdo contém algo inadequado, tome cuidado da próxima vez!')
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Usuário banido por quebra de regras do grupo!.')
                            })
                            return
                        } else if (pre[1].className === 'Sexy' && Math.round(pre[1].probability * 100) > 15) {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Usuário banido por conteúdo pornográfico.')
                            })
                            return
                        } else if (pre[1].className === 'Drawing' && Math.round(pre[1].probability * 100) > 15) {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Usuário banido por conteúdo pornográfico.')
                            })
                            return
                        } else if (pre[1].className === 'Sexy' && Math.round(pre[1].probability * 100) > 15) {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Usuário banido por conteúdo pornográfico.')
                            })
                            return
                        } else if (pre[1].className === 'Hentai' && Math.round(pre[1].probability * 100) > 15) {
                            chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                                msg.reply('Usuário banido por conteúdo pornográfico.')
                            })
                            return
                        }
                        break
                    case 'Sexy':
                        chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                            msg.reply('Usuário banido por conteúdo sexual.')
                        })
                        return
                    case 'Drawing':
                        break
                    }
                }
            })
        } else {
            const model = await nsfwjs.load()
            const myBuffer = Buffer.from(mediaAnalyze.data, 'base64')
            const mediaDecoded = tf.node.decodeImage(myBuffer)
            const predictions = await model.classify(mediaDecoded, 3)
            mediaDecoded.dispose()
            console.log(predictions)
            console.log('==============================================================')
            switch (predictions[0].className) {
            case 'Neutral':
                break
            case 'Hentai':
                chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                    msg.reply('Conteúdo hentai detectado, tomando as devidas providências...')
                })
                return
            case 'Porn':
                if (Math.round(predictions[0].probability * 100) > 73) {
                    msg.reply('Seu conteúdo contém algo inadequado, tome cuidado da próxima vez!')
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por quebra de regras do grupo!')
                    })
                    return
                }
                if (predictions[1].className === 'Sexy' && Math.round(predictions[1].probability * 100) > 15) {
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por conteúdo pornográfico.')
                    })
                    return
                }
                if (predictions[1].className === 'Drawing' && Math.round(predictions[1].probability * 100) > 15) {
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por conteúdo pornográfico.')
                    })
                    return
                }
                if (predictions[1].className === 'Sexy' && Math.round(predictions[1].probability * 100) > 15) {
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por conteúdo pornográfico.')
                    })
                    return
                }
                if (predictions[1].className === 'Hentai' && Math.round(predictions[1].probability * 100) > 15) {
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por conteúdo pornográfico.')
                    })
                }
                break
            case 'Sexy':
                if (predictions[1].className === 'Hentai') {
                    chat.removeParticipants([`${contact.id._serialized}`]).then(() => {
                        msg.reply('Usuário banido por conteúdo pornográfico.')
                    })
                }
                break
            case 'Drawing':
                break
            }
        }
    }
})
