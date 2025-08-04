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
  'getsu',    // 日曜 = 0 → 月曜に見せたいならここで調整
  'ka',
  'sui',
  'moku',
  'kin',
  'do',
  'niti'
];

// === 投稿メッセージ処理 ===
app.message(async ({ message, client }) => {
  try {
    const channelInfo = await client.conversations.info({ channel: message.chann
