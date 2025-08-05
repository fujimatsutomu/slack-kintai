require('dotenv').config();
const { App } = require('@slack/bolt');
const dayjs = require('dayjs');

// Boltアプリ初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// 曜日スタンプ名（日曜=0 → 月曜=0 に変換）
const weekdayToEmoji = [
  'getsu', // 月
  'ka',    // 火
  'sui',   // 水
  'moku',  // 木
  'kin',   // 金
  'do',    // 土
  'niti'   // 日
];

// 指定の月日から「今日に最も近い年」を自動で推定
function resolveDate(month, day) {
  const today = dayjs();
  const candidates = [
    dayjs(`${today.year() - 1}-${month}-${day}`, 'YYYY-M-D'),
    dayjs(`${today.year()}-${month}-${day}`, 'YYYY-M-D'),
    dayjs(`${today.year() + 1}-${month}-${day}`, 'YYYY-M-D'),
  ];

  return candidates
    .filter(date => date.isValid())
    .sort((a, b) => Math.abs(a.diff(today)) - Math.abs(b.diff(today)))[0];
}

// === メッセージ投稿時の処理 ===
app.message(async ({ message, client }) => {
  try {
    const channelInfo = await client.conversations.info({ channel: message.channel });
    const channelName = channelInfo.channel.name;

    if (!message.text || message.subtype === 'bot_message') return;

    // === フリートーク: OK検知で 👀 ===
    if (channelName === 'フリートーク' && message.text.includes('OK')) {
      await client.reactions.add({
        channel: message.channel,
        name: 'eyes',
        timestamp: message.ts
      });
      return;
    }

    // === 勤怠連絡チャンネルのフォーマット検証 ===
    if (channelName === '勤怠連絡') {
      const lines = message.text.trim().split(/\r?\n/);
      let allValid = true;

      const formatRegex = /^(\d{1,2})\/(\d{1,2})\s+\S+\s+\S+(?:\s+\S+)*(\s+計画休)?$/;

      for (const line of lines) {
        const match = line.trim().match(formatRegex);
        if (!match) {
          allValid = false;
          break;
        }

        const [_, month, day] = match;

        const date = resolveDate(month, day);
        if (!date.isValid()) {
          allValid = false;
          break;
        }

        // 曜日補正（日曜=0 → 月曜=0 に変換）
        const emojiIndex = (date.day() + 6) % 7;
        const emoji = weekdayToEmoji[emojiIndex];

        // 曜日スタンプ
        await client.reactions.add({
          channel: message.channel,
          name: emoji,
          timestamp: message.ts
        });

        // 未来・過去スタンプ
        const today = dayjs();
        const directionEmoji = date.isBefore(today, 'day') ? 'rewind' : 'fast_forward';

        await client.reactions.add({
          channel: message.channel,
          name: directionEmoji,
          timestamp: message.ts
        });
      }

      // ✅ or ❌ リアクション
      await client.reactions.add({
        channel: message.channel,
        name: allValid ? 'white_check_mark' : 'x',
        timestamp: message.ts
      });

      // ❌ の場合は注意メッセージ
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

// === 編集されたら警告コメントを送信 ===
app.event('message', async ({ event, client }) => {
  if (event.subtype === 'message_changed') {
    // Bot自身の投稿には反応しないようにする
    if (event.message.bot_id) {
      return;
    }

    try {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.message.ts,
        text: 'この申請は**無効**です。申請と本メッセージを**削除して再度申請**してください。'
      });
    } catch (error) {
      console.error(error);
    }
  }
});

// サーバー起動
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
