/**
 * 知识库数据清洗 & 批量导入脚本
 * 数据源：视频转录 + Excel知识库 + 网站教程
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ===== 1. 视频转录清洗 =====

const video1_raw = `我们下载好AI获客之后呢 点击打开
然后呢 找到AI获客 把这个开关打开 返回 再返回
然后呢 去开启无障碍服务 点击去开启
先把这里有个警告关掉 然后找到已下载的应用
找到AI获客 把第一个开关打开 点击允许
然后我们返回AI获客
这里呢 第一步它会先检查已安装的版本
如果你的版本不对呢 它旁边会有一个下载
我们点击下载就可以了 等它下载完成
然后我们点击下一步 把这个都安装好之后 点击下一步
我们等待这个权限打开
还有关闭我们所需要的一些权限 我们需要耐心的等待5分钟左右
现在的话 我们这个系统进行下一步之前 请先登录微信 小红书 快手 抖音账号
如果注册新号 请用自己手机注册 再登录到AI手机
初始化已经完成了 所有的权限呢已经帮我们部署好了
我们点击下一步 去检测我们账号是否实名
我们点击已经检测全部平台 它会自动帮我们打开每个社媒平台帮你检测你的账号有没有实名 有没有封号的风险
它会帮你打开你的钱包看看有没有实名
现在是已经把账号检测完了 可以看到微信它是没有实名的 小红书已经实名了
我们这些检测完之后呢就点击完成进入工作台 就可以开始进行激活手机了`;

const video2_raw = `现在我们最后一步来教大家怎么去使用我们的这个AI系统
首先第一步呢我们找到超产室去
这里有个AI手机
然后呢我们点击人设IP 点击立即创建
比如说我们人设叫做 双校长火锅
他是一个火锅店就把火锅店呢
他是属于本地商家的一种IP
那如果你是起IP机选个人就选个人
然后点开这个老板说一下你们的一个企业介绍
比如说我们叫双校长火锅是一家精品的网红火锅店
主店长Lina想要当这个IP
他是一个非常幽默搞笑的店长
风格想要做搞笑类型的
我们的目标客户呢大概是周边还有附近的一些上班族
想要吸引他们过来吃火锅
然后点击完成
就大概说成你们的业务就可以了 说的越详细越好
然后这里好之后我们点击创建人设报告
点击确认生成
然后立即前往
然后我们稍等一下等它分析完成
如果不想等的话我们直接点击跳过分析
然后点击确认
它进来的话就是这个界面
那么首先第一步呢是要去配置我们素材库
点击去配置
比如说我们这个IP是一个火锅店对吧
那我们就在这里上传一些我们门店的一些视频或者照片
我直接从我的素材库里面去传
从素材库传
我的素材库里面已经传了火锅相关的一些照片和视频
然后选择确定
等它传上去就可以了
然后下一步呢就是去点击这里它已经保存了
然后这个整体我们选择一个这种字体
往下滑找到我们的这种字体叫做小灌这种字体
然后下面三个也是全都选择小灌这种字体
现在我们已经选择好了所有的小灌这种字体 然后点击保存
然后下一步就是去绑定我们设备
我们点击绑定设备
点击绑定设备
然后我们这里看我们的AI手机上
我们AI手机我们打开我们的这个AI获客的这个软件
它这里是让你扫码 对不对 我们扫一下
绑定完成 点击稍后配置就可以了
然后我们点回我们的人设IP这个地方
我们点击关联我们的设备 我们设备号
这里有一个201D的
然后我们点击选择确定保存
这个手机就可以开始运行了
运行的时候呢我们这个地方一定要开启工作
然后把手机插上电放一边就不用管它了
它这里每天会帮你剪视频自动发`;

// 清洗转录文字为结构化教程
function cleanTranscription(raw, title) {
  const lines = raw.split('\n').filter(l => l.trim());
  const steps = [];
  let currentStep = '';
  
  for (const line of lines) {
    const cleaned = line.trim()
      .replace(/呢$/g, '')
      .replace(/对不对$/g, '')
      .replace(/OK\s*/gi, '')
      .replace(/好$/g, '')
      .replace(/然后$/g, '');
    
    if (!cleaned) continue;
    
    // 检测是否是新步骤（有"第X步"、"下一步"、"首先"等关键词）
    if (/^(首先|第[一二三四五六七八九十]|下一步|点击|我们点|找到|去|打开|选择|上传|扫描|绑定|配置|登录|检测|创建|保存|完成)/.test(cleaned)) {
      if (currentStep) steps.push(currentStep);
      currentStep = cleaned;
    } else {
      if (currentStep) {
        currentStep += '，' + cleaned;
      } else {
        currentStep = cleaned;
      }
    }
  }
  if (currentStep) steps.push(currentStep);
  
  return steps;
}

// ===== 2. Excel 知识库读取 =====
function readExcelKB() {
  const xlsxPath = path.join(process.env.HOME, '教程', '运营部_知识库文件.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const entries = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    const question = String(row[0] || '').trim();
    const answer = String(row[1] || '').trim();
    const screenshot = String(row[2] || '').trim();
    
    if (!question || !answer) continue;
    
    // 格式化答案，如果有截图则附加
    let fullAnswer = answer;
    if (screenshot) {
      fullAnswer += `\n\n📷 参考截图：/uploads/${screenshot}`;
    }
    
    entries.push({ title: question, content: fullAnswer, category: '系统使用问题' });
  }
  return entries;
}

// ===== 3. 网站快速上手指南 =====
function getWebsiteKB() {
  return [
    {
      title: '新手快速上手指南 - 养号篇',
      content: `适用于微信、快手、抖音、小红书。正式使用前，建议先按以下方式养号。

## 建议保留 7 天平稳期
每天正常登录、浏览内容、少量互动；互动阶段不涉及业务，不推销、不引流。

## 账号类型说明

### 新账号
未实名先实名；已实名建议登录满 7 天后，再开始初步使用。

### 长期未使用老账号
很久没用的账号按新账号处理，先实名检查，再稳定使用 7 天。

### 经常使用老账号
可以低频尝试工具，但建议先观察几天，再逐步增加使用频率。

## 核心原则
实名确认｜行业内容｜自然互动｜低频起步

## 好习惯
- 避免短时间内大量添加好友/频繁私信，建议循序渐进
- 发内容前先检查敏感词，保持自然表达更有利于推荐
- 保持稳定的设备和IP，让账号看起来更真实
- 使用官方工具更安全，效果也更稳定
- 内容尽量原创、有价值，平台更喜欢优质内容
- 多账号操作时，间隔建议≥30分钟，账号更安全`,
      category: '养号技巧',
    },
    {
      title: '新手快速上手指南 - 三步上手',
      content: `## 简单三步上手

### 第一步：确认账号状态
检查实名认证、资料完整度和登录状态是否正常。

### 第二步：发布行业内容
初期手动发布行业相关内容，如经验、案例、知识分享。

### 第三步：低频使用工具
账号稳定后，再低频开始使用获客工具，逐步增加频率。

## 安全操作建议
- 每天操作次数建议不超过平台上限的 30%
- 发内容前检查敏感词，避免营销感过强
- 保持稳定的设备与IP，避免频繁更换
- 账号之间操作时间间隔建议≥30分钟
- 定期发布真实有价值的内容增加账号权重
- 平台规则会不定期更新，请以官方公告为准

## 重要提醒
前期互动只做正常浏览、点赞、评论，不涉及业务内容；业务动作从低频开始，账号稳定后再逐步放量。发现账号异常提示时，应立即停止操作并自查是否合规。`,
      category: '使用入门',
    },
    {
      title: '新手快速上手指南 - 设备准备',
      content: `## 支持机型
- Redmi Note 13 5G ✓ 已支持
- Redmi Note 14 5G ✓ 已支持
- Redmi Note 15 5G ✓ 已支持

## 设备说明
- 推荐配置：8+128G 或以上
- 其他机型正在适配中
- 请勿修改手机系统默认字体大小
- 请勿切换为繁体字，保持系统语言为简体中文

## 安装步骤
1. 在Redmi Note手机上安装AI获客应用
2. 下载完成后请允许安装未知来源应用
3. 安装后打开应用准备绑定

## 配置要点
- 启动AI获客
- 开启无障碍服务
- 登录平台账号
- 完成实名认证检测`,
      category: '使用入门',
    },
  ];
}

// ===== 合并 & 输出 =====
const video1Steps = cleanTranscription(video1_raw, '使用教程');
const video2Steps = cleanTranscription(video2_raw, '激活教程');
const excelKB = readExcelKB();
const websiteKB = getWebsiteKB();

// 构建视频教程知识条目
const video1Content = `## AI获客 使用教程（视频转录）

### 操作步骤
${video1Steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 注意事项
- 操作前请先登录微信、小红书、快手、抖音账号
- 新号请用自己手机注册，再登录到AI手机
- 权限配置需要耐心等待约5分钟
- 账号检测会自动检查各平台实名状态`;

const video2Content = `## AI获客 激活教程（视频转录）

### 操作步骤
${video2Steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 关键要点
- 人设描述越详细，AI生成内容越精准
- 素材库需要上传门店相关的照片和视频
- 字体选择推荐使用"小灌"字体
- 设备绑定需要在AI手机上扫码
- 绑定完成后一定要开启工作模式
- 手机插上电放一边，系统每天自动剪辑发布视频`;

const allEntries = [
  { title: 'AI获客 使用教程', content: video1Content, category: '使用入门' },
  { title: 'AI获客 激活教程', content: video2Content, category: '使用入门' },
  ...websiteKB,
  ...excelKB,
];

console.log(`\n📊 清洗完成，共 ${allEntries.length} 条知识库条目：\n`);

const cats = {};
for (const e of allEntries) {
  cats[e.category] = (cats[e.category] || 0) + 1;
}
for (const [cat, count] of Object.entries(cats)) {
  console.log(`  ${cat}: ${count} 条`);
}

// 输出为 JSON 文件供导入
const outputPath = path.join(process.env.HOME, '教程', 'knowledge_import.json');
fs.writeFileSync(outputPath, JSON.stringify(allEntries, null, 2), 'utf8');
console.log(`\n✅ 已保存到: ${outputPath}`);

// 也输出为 Excel 模板格式
const wsData = [['标题', '内容', '分类']];
for (const e of allEntries) {
  wsData.push([e.title, e.content, e.category]);
}
const ws = XLSX.utils.aoa_to_sheet(wsData);
ws['!cols'] = [{ wch: 30 }, { wch: 80 }, { wch: 15 }];
const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, ws, '知识库');
const xlsxOutput = path.join(process.env.HOME, '教程', 'knowledge_import.xlsx');
XLSX.writeFile(newWb, xlsxOutput);
console.log(`✅ Excel 版本: ${xlsxOutput}`);
