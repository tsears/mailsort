const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), 'config.env') })

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

async function run () {
  console.log(`Connecting to ${config.imap.host}:${config.imap.port}`)
  const connection = await imaps.connect(config)
  await connection.openBox('Spam')

  const searchCriteria = ['ALL']
  const fetchOptions = {
    bodies: ['HEADER', 'TEXT'],
    markSeen: false,
  }

  console.log('Fetching Unsorted Messages...')
  const results = await connection.search(searchCriteria, fetchOptions)
  console.log(`Got ${results.length} results`)

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

    if (promises.length > 0) {
      return Promise.all(promises)
    } else {
      return Promise.resolve()
    }
  }
}

run()
  .then(() => { console.log('all done'); process.exit(0) })
  .catch(e => { console.error(e); process.exit(1) })
