const fs = require("fs");

module.exports = ({}, pluginOptions) => {
  const notesDirectory = pluginOptions.notesDirectory || "content/brain/";

  if (!fs.existsSync(notesDirectory)) {
    fs.mkdirSync(notesDirectory, { recursive: true });
  }
};
