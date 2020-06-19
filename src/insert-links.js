const path = require("path");

module.exports = (
  originalRawContent,
  nameToSlugMap,
  externalRefMap,
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
    externalRefMap,
    rootPath,
    pluginOptions.hideDoubleBrackets || false
  );

  if (pluginOptions.linkifyHashtags) {
    // Find matches for content after hashtag
    // e.g. #Example -> Example
    const hashtagRegexExclusive = /(?<=(^|\s)#)\w*\b/g;

    // Find matches for content after hashtag, including the hashtag
    // e.g. #Example -> #Example
    const hashtagRegexInclusive = /(?<=(^|\s))(#\w*)\b/g;
    newRawContent = replaceBasedOnRegex(
      hashtagRegexInclusive,
      hashtagRegexExclusive,
      newRawContent,
      nameToSlugMap,
      externalRefMap,
      rootPath,
      false
    );
  }

  return newRawContent;
};

function replaceBasedOnRegex(
  regexInclusive,
  regexExclusive,
  originalRawContent,
  nameToSlugMap,
  externalRefMap,
  rootPath,
  replaceWithJustText
) {
  let newRawContent = originalRawContent;
  let replacementMatches = originalRawContent.match(regexInclusive);

  if (replacementMatches === null) {
    return newRawContent;
  }

  replacementMatches = replacementMatches
    .filter((a, b) => replacementMatches.indexOf(a) === b)
    .forEach((match) => {
      let justText = match.match(regexExclusive)[0];
      let name = justText.toLowerCase();
      if (name in nameToSlugMap) {
        let link = nameToSlugMap[name];
        let linkPath = rootPath + link;
        let linkified = `[${
          replaceWithJustText ? justText : match
        }](${linkPath})`;
        newRawContent = newRawContent.split(match).join(linkified);
      }
      if (name in externalRefMap) {
        let link = externalRefMap[name];
        let linkified = `[${replaceWithJustText ? justText : match}](${link})`;
        newRawContent = newRawContent.split(match).join(linkified);
      }
    });

  return newRawContent;
}
