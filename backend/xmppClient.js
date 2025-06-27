const { client, xml } = require('@xmpp/client');
const { parseAlert } = require('./alertParser');

// Toggle verbose XMPP logging by setting env var XMPP_VERBOSE=true
const VERBOSE = process.env.XMPP_VERBOSE === 'true';

const setupXmppClient = (io) => {
  // --- User-provided Details ---
  const service = 'xmpp://nwws-oi.weather.gov';
  const domain = 'nwws-oi.weather.gov';
  const username = 'zachary.miller';
  const password = 'K7_xGN8qSPRuJbR';
  const room = 'nwws@conference.nwws-oi.weather.gov';
  // --------------------------------

  const xmpp = client({
    service,
    domain,
    username,
    password,
  });

  const roomJid = `${room}/${username}`;

  xmpp.on('online', async (address) => {
    console.log(`XMPP client online as ${address.toString()}`);
    // Send initial presence to the server
    await xmpp.send(xml('presence'));
    // Join the MUC room
    console.log(`Joining room: ${roomJid}`);
    await xmpp.send(xml('presence', { to: roomJid }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' })));
  });

  xmpp.on('stanza', async (stanza) => {
    // Check for groupchat messages that are not from ourselves
    const from = stanza.attrs.from;
    const isGroupchat = stanza.is('message') && stanza.attrs.type === 'groupchat';
    const isNotSelf = from && !from.endsWith(`/${username}`);

    if (isGroupchat && isNotSelf) {
      const body = stanza.getChildText('body');
      if (VERBOSE) console.log('--- FULL XMPP STANZA RECEIVED ---');
      // console.log(stanza.toString()); // Optional: can be very verbose

      const nwwsDataElement = stanza.getChild('x', 'nwws-oi');

      if (nwwsDataElement) {
        const capXmlString = nwwsDataElement.toString();
        if (VERBOSE) {
          console.log('--- EXTRACTED CAP XML STRING ---');
          console.log(capXmlString.substring(0, 500) + (capXmlString.length > 500 ? '...' : ''));
          console.log('Attempting to parse CAP XML...');
        }
        const parsedAlert = await parseAlert(capXmlString, true);
        if (parsedAlert) {
          if (VERBOSE) console.log('Successfully parsed CAP XML. Emitting alert:', parsedAlert.productType, parsedAlert.headline);
          io.emit('new-alert', parsedAlert);
        } else {
          // console.log('CAP XML present but not parsed into a displayable alert by rule.');
        }
      } else {
        // This path should ideally not be hit if all alerts are CAP XML via nwws-oi
        const messageBody = stanza.getChildText('body');
        if (messageBody) {
          if (VERBOSE) console.log('Received raw message body (no nwws-oi, fallback):', messageBody.substring(0, 200));
          // const alert = await parseAlert(messageBody, false); // old VTEC-only path
          // if (alert) {
          //   console.log('Emitting VTEC alert from raw body:', alert);
          //   io.emit('new-alert', alert);
          // }
        }
      }
    }
  });

  xmpp.on('offline', () => {
    console.log('XMPP client offline');
  });

  xmpp.on('error', (err) => {
    console.error('XMPP error:', err.message);
  });

  xmpp.start().catch(console.error);

  return xmpp;
};

module.exports = { setupXmppClient };
