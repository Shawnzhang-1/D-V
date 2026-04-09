const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const assetsPath = path.join(distPath, 'assets');

const cssFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.css'));
const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js') && !f.endsWith('.map'));

if (cssFiles.length === 0 || jsFiles.length === 0) {
  console.error('未找到CSS或JS文件');
  process.exit(1);
}

const cssFile = path.join(assetsPath, cssFiles[0]);
const jsFile = path.join(assetsPath, jsFiles[0]);

console.log('读取CSS文件:', cssFiles[0]);
console.log('读取JS文件:', jsFiles[0]);

const cssContent = fs.readFileSync(cssFile, 'utf-8');
const jsContent = fs.readFileSync(jsFile, 'utf-8');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Data Viz App</title>
    <style>
${cssContent}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${jsContent}
    </script>
  </body>
</html>`;

const outputPath = path.join(distPath, 'bundle.html');
fs.writeFileSync(outputPath, html, 'utf-8');

console.log('✅ 内联HTML文件已创建:', outputPath);
console.log('文件大小:', (html.length / 1024 / 1024).toFixed(2), 'MB');
