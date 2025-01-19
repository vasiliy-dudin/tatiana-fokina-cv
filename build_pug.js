const pug = require('pug');
const fs = require('fs');

const html = pug.renderFile('src/index.pug', {
  pretty: true
});

fs.writeFileSync('dist/index.html', html);