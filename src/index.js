const dayjs = require('dayjs');
require('dayjs/locale/zh-tw');
const { chain, getClient } = require('bottender');
const { router, text, line } = require('bottender/router');

dayjs.locale('zh-tw');

const lineClient = getClient('line');
const REPLY_CONFIG = {
  eat_at_home: '回家吃晚餐',
  no_eat_at_home: '有事不回家吃',
  list_member: '看誰會回家吃飯',
};

async function greeting(ctx) {
  await ctx.sendText('你好，我是 J 管家，很高興為您服務!');
  return await ctx.sendButtonTemplate('這個是 button template', {
    thumbnailImageUrl: process.env.IMAGE_DINNER_THUMBNAIL,
    title: '晚餐調查',
    text: `請問你要回家吃晚餐嗎？今天是 ${dayjs().format('MM/DD ddd')}`,
    actions: [
      {
        type: 'postback',
        label: '回家吃',
        data: REPLY_CONFIG.eat_at_home,
      },
      {
        type: 'postback',
        label: '有事不回家吃',
        data: REPLY_CONFIG.no_eat_at_home,
      },
      {
        type: 'postback',
        label: '看誰回家吃飯',
        data: REPLY_CONFIG.list_member,
      },
    ],
  });
}

async function dinnerStatic(ctx) {
  const responseText = ctx.event.postback.data;
  const userId = ctx.event.source.userId;
  const replyTimestamp = dayjs(ctx.event.timestamp);
  const userProfile = await lineClient.getUserProfile(userId);
  // {
  //   displayName: 'LINE taro',
  //   userId: USER_ID,
  //   pictureUrl: 'http://obs.line-apps.com/...',
  //   statusMessage: 'Hello, LINE!',
  // }
  console.log(`${responseText}, ${userProfile.displayName}, ${replyTimestamp}`);
  const dinnerMembers = ctx.state.dinnerMembers || [];
  let todayMembers = dinnerMembers.filter((member) => {
    if (!member.timestamp) return false;
    return dayjs(member.timestamp) > dayjs().startOf('day');
  });

  if (responseText !== REPLY_CONFIG.list_member) {
    if (
      // 要回家吃飯
      responseText === REPLY_CONFIG.eat_at_home &&
      !todayMembers.find(
        (member = {}) => member.name === userProfile.displayName
      )
    ) {
      todayMembers.push({
        name: userProfile.displayName,
        timestamp: dayjs(),
      });
    } else if (responseText === REPLY_CONFIG.no_eat_at_home) {
      // 不回家吃飯
      todayMembers = todayMembers.filter(
        (member = {}) => member.name !== userProfile.displayName
      );
    }

    ctx.setState({
      dinnerMembers: todayMembers,
    });
  }

  const todayMembersNames = todayMembers.map((member = {}) => member.name);
  const todayLabel = dayjs().format('MM/DD ddd');

  return ctx.replyText(
    `[${todayLabel}] 今天回家吃飯的有：${todayMembersNames.join(', ')}`
  );
}

async function RuleBased(context, { next }) {
  return router([text('管家', greeting), line.postback(dinnerStatic)]);
}

module.exports = async function App() {
  return chain([RuleBased]);
};
