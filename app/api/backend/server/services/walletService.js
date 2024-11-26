const IntaSend = require('intasend-node');
const User = require('../models/User');
const Claim = require('../models/Claim'); // Assuming you have a Claim model
const { sendNotification } = require('../utils/notifications'); // Assuming you have a notification utility

const intasend = new IntaSend(
  'ISPubKey_live_11fd885a-9338-4dcf-9d74-c387f5df1c90',
  'ISSecretKey_live_7774eacb-0e94-4119-85fe-3bff02b585c0',
  process.env.NODE_ENV !== 'production'
);

exports.createWallet = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.wallet.id) {
      return user.wallet;
    }

    const wallets = intasend.wallets();
    const response = await wallets.create({
      label: `${user.role.toUpperCase()}-${userId}`,
      wallet_type: 'WORKING',
      currency: 'KES',
      can_disburse: true
    });

    user.wallet.id = response.wallet_id;
    await user.save();

    return response;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
};

exports.getWalletBalance = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.wallet.id) {
      throw new Error('Wallet not found');
    }

    const wallets = intasend.wallets();
    const response = await wallets.retrieve(user.wallet.id);

    user.wallet.balance = parseFloat(response.available_balance);
    await user.save();

    return user.wallet;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
};

exports.initiateMoneyBackGuarantee = async (adminId, employerId, claimId) => {
  try {
    // Verify admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can initiate money-back guarantees');
    }

    // Verify employer and claim
    const employer = await User.findById(employerId);
    if (!employer || employer.role !== 'employer') {
      throw new Error('Invalid employer');
    }

    const claim = await Claim.findById(claimId);
    if (!claim || claim.status !== 'approved' || claim.employerId.toString() !== employerId) {
      throw new Error('Invalid or unapproved claim');
    }

    // Find the associated order
    const order = await Order.findById(claim.orderId);
    if (!order) {
      throw new Error('Associated order not found');
    }

    // Ensure system escrow wallet exists
    const systemWalletId = process.env.SYSTEM_ESCROW_WALLET_ID;
    if (!systemWalletId) {
      throw new Error('System escrow wallet not configured');
    }

    // Ensure employer has a wallet
    if (!employer.wallet.id) {
      await exports.createWallet(employerId);
    }

    const refundAmount = order.amount; // Use the original order amount for refund

    // Initiate refund from system escrow to employer
    const wallets = intasend.wallets();
    const response = await wallets.sendMoney({
      wallet_id: systemWalletId, // From system escrow
      recipient_wallet_id: employer.wallet.id, // To employer
      currency: 'KES',
      amount: refundAmount,
      reference: `REFUND-${claimId}-${Date.now()}`
    });

    if (response.status === 'SUCCESS') {
      // Update claim status
      await Claim.findByIdAndUpdate(claimId, { 
        status: 'refunded', 
        refundAmount: refundAmount,
        refundDate: new Date()
      });

      // Update order status
      await Order.findByIdAndUpdate(order._id, {
        status: 'refunded'
      });

      // Find the writer to notify them
      const writer = await User.findById(claim.writerId);

      // Notify both employer and writer
      await sendNotification(employerId, 'Refund processed', `A refund of KES ${refundAmount} has been processed for order ${order._id}`);
      if (writer) {
        await sendNotification(writer._id, 'Order refunded', `The order ${order._id} has been refunded to the employer`);
      }
    } else {
      throw new Error('Refund transaction failed');
    }

    return response;
  } catch (error) {
    console.error('Error initiating money-back guarantee:', error);
    throw error;
  }
};

exports.initiateWithdrawal = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.wallet.id) {
      throw new Error('Wallet not found');
    }

    // Check if it's the 15th or last day of the month
    const today = new Date();
    const isWithdrawalDay = today.getDate() === 15 || today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    if (!isWithdrawalDay) {
      throw new Error('Withdrawals are only allowed on the 15th and last day of the month');
    }

    // Check if user has sufficient balance
    if (user.wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const wallets = intasend.wallets();
    const response = await wallets.sendMoney({
      wallet_id: user.wallet.id,
      currency: 'KES',
      amount: amount,
      method: 'MPESA',
      mobile_number: user.phoneNumber,
      reference: `WITHDRAWAL-${userId}-${Date.now()}`
    });

    if (response.status === 'SUCCESS') {
      user.wallet.balance -= amount;
      user.wallet.lastWithdrawal = new Date();
      await user.save();
    }

    return response;
  } catch (error) {
    console.error('Error initiating withdrawal:', error);
    throw error;
  }
};

module.exports = exports;