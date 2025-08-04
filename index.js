require('dotenv').config();

const { App } = require('@slack/bolt');

// Boltアプリ初期化（環境変数にSLACK_BOT_TOKENとSLACK_SIGNING_SECRETが必要）
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// メッセージ受信イベントを監視
app.message(async ({ message, say, client }) => {
  try {
    // 投稿チャンネルが「フリートーク」かどうか調べるためにチャンネル名取得
    const channelInfo = await client.conversations.info({ channel: message.channel });
    const channelName = channelInfo.channel.name;

    if (channelName === 'フリートーク' && message.text && message.text.includes('OK')) {
      // 👀のリアクションをつける
      await client.reactions.add({
        channel: message.channel,
        name: 'eyes',
        timestamp: message.ts
      });
    }
  } catch (error) {
    console.error(error);
  }
});

// イベント受信のためのエンドポイントで起動
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();

