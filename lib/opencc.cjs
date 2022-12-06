const OpenCC = require("opencc");
const converter = new OpenCC("t2s.json");

converter.convertPromise("汉字").then((converted) => {
  console.log(new Date(), "converted:", converted); // 漢字
});

exports.converter = converter;
