const fs = require("fs");

module.exports = (pluginOptions) => {
  const contentPath = pluginOptions.path || "content/brain/";

  if (!fs.existsSync(contentPath)) {
    fs.mkdirSync(contentPath, { recursive: true });
  }
};
