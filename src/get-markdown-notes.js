const fs = require("fs");
const path = require("path");

module.exports = (pluginOptions) => {
  let notesDirectory = pluginOptions.notesDirectory || "content/brain/";
  let notesFileExtensions = pluginOptions.notesFileExtensions || [
    ".md",
    ".mdx",
  ];

  let fileContents = [];

  let filenames = fs.readdirSync(notesDirectory);

  filenames
    .filter((filename) => {
      return notesFileExtensions.includes(path.extname(filename).toLowerCase());
    })
    .forEach((filename) => {
      let slug = pluginOptions.generateSlug
        ? pluginOptions.generateSlug(filename)
        : path.parse(filename).name.toLowerCase();
      let fullPath = notesDirectory + filename;
      let rawFile = fs.readFileSync(fullPath, "utf-8");
      fileContents.push({
        filename: filename,
        fullPath: fullPath,
        slug: slug,
        rawFile: rawFile,
      });
    });

  return fileContents;
};
