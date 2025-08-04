require('dotenv').config();
const { App } = require('@slack/bolt');
const dayjs = require('dayjs');

// Boltアプリ初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Slackのカスタムスタンプ名（曜日）
const weekdayToEmoji = [
  'getsu', // 日曜
  'ka',
  'sui',
  'moku',
  'kin',
  'do',
  'niti'
];

// === 編集されたメッセージを即削除 ===
app.event('message', async ({ event, client }) => {
  if (event.subtype === 'message_changed') {
    try {
      await client.chat.delete({
        channel: event.channel,
        ts: event.message.ts
      });

      // 通知したい場合（任意）
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.message.ts,
        text: `<@${event.message.user}> さん、メッセージの編集は禁止されています。削除しました。`
      });
    } catch (error) {
      console.error('編集削除エラー:', error);
    }
  }
});

// === 通常のメッセージ処理 ===
app.message(async ({ message, client }) => {
  try {
    const channelInfo = await client.conversations.info({ channel: message.channel });
    const channelName = channelInfo.channel.name;

    // === フリートークのOK対応 ===
    if (channelName === 'フリートーク' && message.text && message.text.includes('OK')) {
      await client.reactions.add({
        channel: message.channel,
        name: 'eyes',
        timestamp: message.ts
      });
      return;
    }

    // === 勤怠連絡チャンネルのチェック ===
    if (channelName === '勤怠連絡') {
      if (!message.text || message.subtype === 'bot_message') return;

      const lines = message.text.trim().split(/\n|\r/);
      let allValid =
