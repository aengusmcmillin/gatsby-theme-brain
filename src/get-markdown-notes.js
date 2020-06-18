const fs = require("fs");
const path = require("path");
const generateSlug = require("./generate-slug");

function toRegExp(value) {
  if (typeof value === "string") {
    return new RegExp(`^${value}$`);
  }
  return value;
}

const matches = (filename) => (regExp) => regExp.test(filename);
const doesNotMatchAny = (regExps) => (filename) =>
  !regExps.some(matches(filename));

module.exports = (pluginOptions) => {
  let notesDirectory = pluginOptions.notesDirectory || "content/brain/";
  let notesFileExtensions = pluginOptions.notesFileExtensions || [
    ".md",
    ".mdx",
  ];
  let exclusions =
    (pluginOptions.exclude && pluginOptions.exclude.map(toRegExp)) || [];

  let filenames = fs.readdirSync(notesDirectory);

  return filenames
    .filter((filename) => {
      return notesFileExtensions.includes(path.extname(filename).toLowerCase());
    })
    .filter(doesNotMatchAny(exclusions))
    .map((filename) => {
      let slug = pluginOptions.generateSlug
        ? pluginOptions.generateSlug(filename)
        : generateSlug(path.parse(filename).name);

      let fullPath = notesDirectory + filename;

      let rawFile = fs.readFileSync(fullPath, "utf-8");

      return {
        filename: filename,
        fullPath: fullPath,
        slug: slug,
        rawFile: rawFile,
      };
    });
};
