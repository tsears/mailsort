const path = require('path')
const colors = require('colors')
const ProgressBar = require('progress')
require('dotenv').config({ path: path.resolve(process.cwd(), 'config.env') })

let connection

// JSON document should contain key value pairs in the form of:
// "emailuser": "IMAP Destination Mailbox"
// e.g.
// {
//   "github": "INBOX/GitHub"
// }
//
// where the key corresponds to the email address "github@mydomain.net"

const boxMapping = require('./mappings.json')

const imaps = require('imap-simple')

const config = {
  imap: {
    user: process.env.IMAP_USERNAME,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_SERVER,
    port: process.env.IMAP_PORT,
    tls: true,
    authTimeout: 3000,
  },
}

async function connect () {
  console.log(`Connecting to ${config.imap.host}:${config.imap.port}`)
  connection = await imaps.connect(config)
  console.log('Connected')
}

async function sortMessages () {
  await connection.openBox('Spam')

  const searchCriteria = ['ALL']
  const fetchOptions = {
    bodies: ['HEADER', 'TEXT'],
    markSeen: false,
  }

  console.log('Sorting Messages...'.bold.yellow)
  const results = await connection.search(searchCriteria, fetchOptions)
  if (results.length > 0) {
    console.log(`Sorted ${results.length} results`.green)
  } else {
    console.log('No new messages'.red)
  }

  if (results.length > 0) {
    const promises = []
    results.forEach(result => {
      const header = result.parts.filter(part => part.which === 'HEADER')
      const to = header[0].body.to

      if (!to) {
        return
      }

      const whichEmail = to.find(
        to => to.toLowerCase().includes(`@${process.env.EMAIL_DOMAIN}`)
      )
      if (!whichEmail) {
        return
      }

      const emailAddress =
        whichEmail.match(/([a-zA-Z0-9._-]+@tsears\.net)/gi)[0].toLowerCase()
      const bucket = emailAddress.replace(`@${process.env.EMAIL_DOMAIN}`, '')

      if (boxMapping[bucket]) {
        console.log(`Moving message ${result.attributes.uid} ${emailAddress} to ${boxMapping[bucket]}`)

        promises.push(
          connection.moveMessage(`${result.attributes.uid}`, boxMapping[bucket])
        )
      } else {
        console.warn(`*** Unknown recipient ${bucket} ***`)
      }
    })

    connection.closeBox()
    if (promises.length > 0) {
      return Promise.all(promises)
    } else {
      return Promise.resolve()
    }
  }

  connection.closeBox()
}

async function getUnreadFromMailbox (boxName) {
  await connection.openBox(boxName)

  const searchCriteria = ['UNSEEN']
  const fetchOptions = {
    bodies: ['HEADER'],
    markSeen: false,
  }

  const searchResults = await connection.search(searchCriteria, fetchOptions)
  await connection.closeBox()

  if (searchResults.length) {
    return searchResults.map(r => {
      return r.parts.filter(p => p.which === 'HEADER')[0].body.subject[0]
    })
  } else {
    return null
  }
}

async function listUnread () {
  const boxes = await connection.getBoxes()
  const boxNames = Object.keys(boxes.INBOX.children).sort()

  const results = {}

  console.log('\nCollecting unread messages'.bold.cyan)
  const bar = new ProgressBar(
    '[:bar] :current/:total :percent ETA :etas Elapsed :elapsed :currentBox',
    {
      total: boxNames.length,
      width: 50,
    }
  )

  // "whoa dude, why aren't you doing this in parallel?" - right?
  // because nasty side-effect driven library can't handle that sort of thing.
  // see the "openBox/closeBox" business
  for (const boxName of boxNames) {
    bar.tick({ currentBox: boxName })
    const unreadMessages = await getUnreadFromMailbox(`INBOX/${boxName}`)

    if (unreadMessages) {
      results[boxName] = [
        ...unreadMessages,
      ].join('\n')
    }
  }

  const boxesWithUnreadMessages = Object.keys(results).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  boxesWithUnreadMessages.forEach(b => {
    console.log(b.bold.underline.green)
    console.log(results[b].white)
    console.log('')
  })
}

async function run () {
  await connect()
    .then(() => { return sortMessages() })
    .then(() => { return listUnread() })
    .then(() => { console.log('all done') })
    .catch(e => {
      console.error(e)
      try {
        connection.end()
      } catch (e) {
        // drop it, was never connected
      }
      process.exit(1)
    })
    .finally(() => { connection.end(); process.exit(0) })
}

run()
