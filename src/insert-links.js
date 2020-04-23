const path = require("path");

module.exports = (
  originalRawContent,
  nameToSlugMap,
  rootPath,
  pluginOptions
) => {
  // Find matches for content between double brackets
  // e.g. [[Example]] -> Example
  const bracketRegexExclusive = /(?<=\[\[).*?(?=\]\])/g;

  // Find matches for content between double brackets including the brackets
  // e.g. [[Example]] -> [[Example]]
  const bracketRegexInclusive = /\[\[.*?\]\]/g;

  let newRawContent = replaceBasedOnRegex(
    bracketRegexInclusive,
    bracketRegexExclusive,
    originalRawContent,
    nameToSlugMap,
    rootPath
  );

  if (pluginOptions.linkifyHashtags) {
    // Find matches for content after hashtag
    // e.g. #Example -> Example
    const hashtagRegexExclusive = /(?<=#)\w*\b/g;

    // Find matches for content after hashtag, including the hashtag
    // e.g. #Example -> #Example
    const hashtagRegexInclusive = /(#\w*)\b/g;
    newRawContent = replaceBasedOnRegex(
      hashtagRegexInclusive,
      hashtagRegexExclusive,
      newRawContent,
      nameToSlugMap,
      rootPath
    );
  }

  return newRawContent;
};

function replaceBasedOnRegex(
  regexInclusive,
  regexExclusive,
  originalRawContent,
  nameToSlugMap,
  rootPath
) {
  let newRawContent = originalRawContent;
  let replacementMatches = originalRawContent.match(regexInclusive);

  if (replacementMatches === null) {
    return newRawContent;
  }

  replacementMatches = replacementMatches
    .filter((a, b) => replacementMatches.indexOf(a) === b)
    .forEach((match) => {
      var justText = match.match(regexExclusive)[0];
      var link = nameToSlugMap[justText.toLowerCase()];
      var linkPath = path.join("/", rootPath, link);
      var linkified = `[${match}](${linkPath})`;
      newRawContent = newRawContent.split(match).join(linkified);
    });

  return newRawContent;
}
