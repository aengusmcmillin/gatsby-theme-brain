const path = require("path");

module.exports = (originalRawContent, nameToSlugMap, rootPath) => {
  var newRawContent = originalRawContent;

  const regexExclusive = /(?<=\[\[).*?(?=\]\])/g;
  const regexInclusive = /\[\[.*?\]\]/g;
  var replacementMatches = originalRawContent.match(regexInclusive);
  if (replacementMatches != null) {
    replacementMatches = replacementMatches.filter(
      (a, b) => replacementMatches.indexOf(a) === b
    );
    replacementMatches.forEach((match) => {
      var justText = match.match(regexExclusive)[0];
      var link = nameToSlugMap[justText.toLowerCase()];
      var linkPath = path.join("/", rootPath, link);
      var linkified = `[${match}](${linkPath})`;
      newRawContent = newRawContent.split(match).join(linkified);
    });
  }
  return newRawContent;
};
