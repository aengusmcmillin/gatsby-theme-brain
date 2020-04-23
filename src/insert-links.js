const path = require("path");

module.exports = (originalRawContent, nameToSlugMap, rootPath) => {
  let newRawContent = originalRawContent;

  // Find matches for content between double brackets
  // e.g. [[Example]] -> Example
  const regexExclusive = /(?<=\[\[).*?(?=\]\])/g;

  // Find matches for content between double brackets including the brackets
  // e.g. [[Example]] -> [[Example]]
  const regexInclusive = /\[\[.*?\]\]/g;

  let replacementMatches = originalRawContent.match(regexInclusive);

  if (replacementMatches === null) {
    return newRawContent;
  }

  replacementMatches = replacementMatches
    .filter((a, b) => replacementMatches.indexOf(a) === b)
    .forEach((match) => {
      let justText = match.match(regexExclusive)[0];
      let link = nameToSlugMap[justText.toLowerCase()];
      let linkPath = path.join("/", rootPath, link);
      let linkified = `[${match}](${linkPath})`;

      newRawContent = newRawContent.split(match).join(linkified);
    });

  return newRawContent;
};
