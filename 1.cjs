const hbsParser = require('@handlebars/parser');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');
const pinyinAll = require('pinyin');
const crypto = require('crypto');
const htmlparser2 = require('htmlparser2');
const pinyin = pinyinAll.pinyin


let Visitor = hbsParser.Visitor
let parse = hbsParser.parse
let print = hbsParser.print

const chineseContent = {}; // 用于存储中文内容和对应的变量名

let visitor = new Visitor();
visitor.ContentStatement = function (comment) {
  if (comment?.value && comment.value != '\n') {
    let html = comment.value

    // 解析 HTML
    const parsedHtml = htmlparser2.parseDocument(html);

    // 遍历解析后的节点并替换文本
    function traverseNodes(node) {
      if (node.type === 'text' && node.data.trim() !== '' && node.data.trim() !== '\n') {
        let text = node.data
        const pinyinStr = pinyin(text, { style: pinyin.STYLE_NORMAL }).join('');
        const pinyinShort = pinyinStr.substring(0, 10); // 取前10个字符
        const hash = crypto.createHash('md5').update(pinyinStr).digest('hex').substring(0, 5);
        const key = `${pinyinShort}_${hash}`.replace(/[\n\s]+/g, '');
        chineseContent[key] = text;
        node.data = `{{${key}}}`

      } else if (node.type === 'tag' && node.children) {
        // 这里是标签节点，递归遍历子节点
        node.children.forEach(child => traverseNodes(child));
      }
    }

    parsedHtml.children.forEach(child => traverseNodes(child));

    // 将修改后的节点重新生成 HTML 字符串
    function generateHtml(node) {
      if (node.type === 'text') {
        // 移除多余的空格和换行符
        return node.data.trim().replace(/\s+/g, ' ');
      } else if (node.type === 'tag') {
        const childrenHtml = node.children.map(child => generateHtml(child)).join('');
        return `<${node.name}>${childrenHtml}</${node.name}>`;
      } else if (node.type === 'directive') {
        return node.data;
      } else if (node.type === 'comment') {
        return `<!--${node.data}-->`;
      } else if (node.type === 'script') {
        return `<script>${node.data}</script>`;
      } else if (node.type === 'style') {
        return `<style>${node.data}</style>`;
      }
      return '';
    }

    const newHtml = parsedHtml.children.map(child => generateHtml(child)).join('');

    console.log('newHtml', newHtml);

    comment.value = newHtml
  }
};
let str2 = `
  <h1>{{这里是中文标题}}</h1>
  <p>{{这里是中文段落}}</p>
`;
let str = `
{{aa}}{{bb}}
{{#if aa}}
  <h1>这里是中文标题11</h1>
  <p>这里是中文段落222</p>
  waimian6666
{{/if}}
`;
let ast2 = parse(str);
visitor.accept(
  ast2
);
// console.log('hbs.template', hbs.template);

// console.log('print(ast2)', hbs.precompile(ast2));
let compiler = hbs.compile(ast2)
// console.log('pre',pre);

compiler({ aa: '3333', bb: '444' });
console.log("compiler", compiler({ aa: '3333', bb: '444' }));

const jsonFilePath = path.join(__dirname, 'translations.json');
fs.writeFileSync(jsonFilePath, JSON.stringify(chineseContent, null, 2), 'utf8');

