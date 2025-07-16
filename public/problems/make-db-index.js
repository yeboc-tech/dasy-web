const fs = require("fs");
const path = require("path");

const contentsDir = path.join(__dirname);
const outputFile = path.join(__dirname, "db-index.ts");

// 현재 디렉토리 내의 폴더만 필터링
const folders = fs.readdirSync(contentsDir).filter((file) => {
  const fullPath = path.join(contentsDir, file);
  return fs.statSync(fullPath).isDirectory();
});

const result = {};

folders.forEach((folder) => {
  const folderPath = path.join(contentsDir, folder);
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => fs.statSync(path.join(folderPath, file)).isFile());
  result[folder] = files;
});

// JS 파일로 저장
const output = "export default " + JSON.stringify(result, null, 2) + ";\n";
fs.writeFileSync(outputFile, output, "utf8");

console.log("output.js 파일이 생성되었습니다.");
