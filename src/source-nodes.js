const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

module.exports = (
  { actions, createNodeId, createContentDigest },
  pluginOptions
) => {
  let notesDirectory = pluginOptions.notesDirectory || "content/brain/";

  let { slugToNoteMap, nameToSlugMap, allReferences } = processNotesDirectory(
    notesDirectory
  );

  let backlinkMap = new Map();
  allReferences.forEach(({ source, references }) => {
    if (references == null) return;

    references.forEach((reference) => {
      let lower = reference.toLowerCase();
      if (nameToSlugMap[lower] == null) {
        let slug = options.generateSlug ? options.generateSlug(reference) : generateSlug(lower);
        if (nameToSlugMap[slug] == null) {
          // Double check that the slugified version isn't already there
          slugToNoteMap[slug] = {
            slug: slug,
            title: slug,
            content: "",
            rawContent: "",
            frontmatter: {
              title: slug,
            },
            outboundReferences: [],
            inboundReferences: [],
          };
          nameToSlugMap[slug] = slug;
        }
        nameToSlugMap[lower] = slug;
      }

      let slug = nameToSlugMap[lower];
      if (backlinkMap[slug] == null) {
        backlinkMap[slug] = [];
      }
      backlinkMap[slug].push(`${source}`);
    });
  });

  let rootPath = pluginOptions.rootPath || "brain";
  for (var slug in slugToNoteMap) {
    var note = slugToNoteMap[slug];

    const { createNode } = actions;

    var originalRawContent = note.rawContent;
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
        var linkified = `[${match}](/${rootPath}/${link})`;
        newRawContent = newRawContent.split(match).join(linkified);
      });
    }

    const brainNoteNode = {
      id: createNodeId(`${slug} >>> BrainNote`),
      title: note.title,
      slug: slug,
      content: note.content,
      rawContent: newRawContent,
      absolutePath: note.fullPath,
      children: [],
      parent: null,
      internal: {
        type: `BrainNote`,
        mediaType: `text/markdown`,
      },
    };
    brainNoteNode.outboundReferences = note.outboundReferences;
    let inboundReferences = backlinkMap[slug];
    // For now removing duplicates because we don't give any other identifying information
    // Later I will be adding previews of the exact reference so duplicates will be needed
    if (inboundReferences != null) {
      inboundReferences = inboundReferences.filter(
        (a, b) => inboundReferences.indexOf(a) === b
      );
    }
    brainNoteNode.inboundReferences = inboundReferences;
    brainNoteNode.internal.contentDigest = createContentDigest(brainNoteNode);

    createNode(brainNoteNode);
  }
};

function processNotesDirectory(notesDirectory) {
  let slugToNoteMap = new Map();
  let nameToSlugMap = new Map();
  let allReferences = [];

  let filenames = fs.readdirSync(notesDirectory);
  filenames.forEach((filename) => {
    let slug = path.parse(filename).name.toLowerCase();
    let fullPath = notesDirectory + filename;
    let rawFile = fs.readFileSync(fullPath, "utf-8");
    let fileContents = matter(rawFile);

    let content = fileContents.content;
    let frontmatter = fileContents.data;

    let title = slug;
    nameToSlugMap[slug] = slug;
    if (frontmatter.title != null) {
      title = frontmatter.title;
      nameToSlugMap[frontmatter.title.toLowerCase()] = slug;
    }
    if (frontmatter.aliases != null) {
      frontmatter.aliases
        .map((a) => a.toLowerCase())
        .forEach((alias) => {
          nameToSlugMap[alias] = slug;
        });
    }

    const regex = /(?<=\[\[).*?(?=\]\])/g;
    let outboundReferences = content.match(regex);
    if (outboundReferences != null) {
      outboundReferences = outboundReferences.map(function (match) {
        return match;
      });
    }
    allReferences.push({
      source: slug,
      references: outboundReferences,
    });

    if (frontmatter.title == null) {
      frontmatter.title = slug;
    }

    slugToNoteMap[slug] = {
      title: title,
      content: content,
      rawContent: rawFile,
      fullPath: fullPath,
      frontmatter: frontmatter,
      outboundReferences: outboundReferences,
      inboundReferences: [],
    };
  });

  return {
    slugToNoteMap: slugToNoteMap,
    nameToSlugMap: nameToSlugMap,
    allReferences: allReferences,
  };
}

function generateSlug(str) {
  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  var to = "aaaaeeeeiiiioooouuuunc------";
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes

  return str;
}
