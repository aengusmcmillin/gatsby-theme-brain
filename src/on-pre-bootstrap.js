const fs = require("fs");

module.exports = ({}, pluginOptions) => {
  const notesDirectory = pluginOptions.notesDirectory || "content/brain/";
  console.log(`Trying directory ${notesDirectory}`);

  if (!fs.existsSync(notesDirectory)) {
    fs.mkdirSync(notesDirectory, { recursive: true });
  }
};
