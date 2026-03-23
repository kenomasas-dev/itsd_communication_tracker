const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

let modifiedCount = 0;
walkDir(path.join(__dirname, 'src'), function (filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(/http:\/\/localhost:500[01]/g, '');
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log('Modified', filePath);
            modifiedCount++;
        }
    }
});

console.log('Total files modified:', modifiedCount);
