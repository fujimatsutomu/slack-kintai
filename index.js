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

// メッセージ受信イベント
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
      let allValid = true;

      const formatRegex = /^(\d{1,2})\/(\d{1,2})\s+\S+\s+\S+(\s+\S+)*(\s+計画休)?$/;

      for (const line of lines) {
        const match = line.trim().match(formatRegex);
        if (match) {
          const [_, month, day] = match;
          const date = dayjs(`${dayjs().year()}-${month}-${day}`, 'YYYY-M-D');

          if (!date.isValid()) {
            allValid = false;
            break;
          }

          const weekdayEmoji = weekdayToEmoji[date.day()];

          await client.reactions.add({
            channel: message.channel,
            name: weekdayEmoji,
            timestamp: message.ts
          });
        } else {
          allValid = false;
          break;
        }
      }

      await client.reactions.add({
        channel: message.channel,
        name: allValid ? 'white_check_mark' : 'x',
        timestamp: message.ts
      });

      if (!allValid) {
        await client.chat.postMessage({
          channel: message.channel,
          thread_ts: message.ts,
          text: '`日付` `名字` `休暇種別` `理由など` `計画休かどうか` の形式で入力してください。\n例: 8/5 藤間 休暇 体調不良'
        });
      }
    }

  } catch (error) {
    console.error(error);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
