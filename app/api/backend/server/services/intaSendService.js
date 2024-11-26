const IntaSend = require('intasend-node');

const intasend = new IntaSend(
  'ISPubKey_live_11fd885a-9338-4dcf-9d74-c387f5df1c90',
  'ISSecretKey_live_7774eacb-0e94-4119-85fe-3bff02b585c0',
  process.env.NODE_ENV !== 'production'
);

exports.initiatePayment = async (email, phoneNumber, amount) => {
  try {
    const collection = intasend.collection();
    const response = await collection.mpesaStkPush({
      first_name: email.split('@')[0],
      last_name: '',
      email: email,
      host: process.env.FRONTEND_URL,
      amount: amount,
      phone_number: phoneNumber,
      api_ref: 'test',
    });

    return response;
  } catch (error) {
    console.error('IntaSend payment initiation error:', error);
    throw error;
  }
};

exports.checkPaymentStatus = async (invoiceId) => {
  try {
    const collection = intasend.collection();
    const response = await collection.status(invoiceId);
    return response.status;
  } catch (error) {
    console.error('IntaSend payment status check error:', error);
    throw error;
  }
};

module.exports = exports;