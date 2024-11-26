const IntaSend = require('intasend-node');

const intasend = new IntaSend(
  'ISPubKey_live_11fd885a-9338-4dcf-9d74-c387f5df1c90',
  'ISSecretKey_live_7774eacb-0e94-4119-85fe-3bff02b585c0',
  process.env.NODE_ENV !== 'production'
);

module.exports = intasend;