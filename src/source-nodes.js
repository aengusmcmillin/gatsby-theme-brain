const matter = require("gray-matter");
const getMarkdownNotes = require("./get-markdown-notes");
const insertLinks = require("./insert-links");
const generateSlug = require("./generate-slug");

module.exports = (
  { actions, createNodeId, createContentDigest },
  pluginOptions
) => {
  let markdownNotes = getMarkdownNotes(pluginOptions);
  let { slugToNoteMap, nameToSlugMap, allReferences } = processMarkdownNotes(
    markdownNotes
  );

  let backlinkMap = new Map();
  allReferences.forEach(({ source, references }) => {
    if (references == null) return;

    references.forEach((reference) => {
      let lower = reference.toLowerCase();
      if (nameToSlugMap[lower] == null) {
        let slug = pluginOptions.generateSlug
          ? pluginOptions.generateSlug(reference)
          : generateSlug(lower);
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

  // Create Nodes
  let slugToNoteNodeMap = new Map();
  let rootPath = pluginOptions.rootPath || "brain";
  for (var slug in slugToNoteMap) {
    var note = slugToNoteMap[slug];

    const newRawContent = insertLinks(note.content, nameToSlugMap, rootPath);

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
    let outboundReferences = note.outboundReferences;


    if (outboundReferences) {
      // Use the slug for easier use in queries
      outboundReferences = outboundReferences.map((match) => {
        return nameToSlugMap[match.toLowerCase()];
      });
      // Filter duplicates
      outboundReferences = outboundReferences.filter(
        (a, b) => outboundReferences.indexOf(a) === b
      );
      brainNoteNode.outboundReferences = outboundReferences;
    }

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

    slugToNoteNodeMap[slug] = brainNoteNode;
  }

  const { createNode } = actions;
  for (var slug in slugToNoteNodeMap) {
    var brainNoteNode = slugToNoteNodeMap[slug];
    if(brainNoteNode.outboundReferences) {
      var outboundReferenceNoteIds = brainNoteNode.outboundReferences.map(
        (matchSlug) => slugToNoteNodeMap[matchSlug].id
      );
      brainNoteNode.outboundReferenceNotes___NODE = outboundReferenceNoteIds;
    }
    if (brainNoteNode.inboundReferences != null) {
      var inboundReferenceNoteIds = brainNoteNode.inboundReferences.map(
        (matchSlug) => slugToNoteNodeMap[matchSlug].id
      );
      brainNoteNode.inboundReferenceNotes___NODE = inboundReferenceNoteIds;
    }

    createNode(brainNoteNode);
  }
};

function processMarkdownNotes(markdownNotes) {
  let slugToNoteMap = new Map();
  let nameToSlugMap = new Map();
  let allReferences = [];

  markdownNotes.forEach((note) => {
    let slug = note.slug;
    let fullPath = note.fullPath;
    let rawFile = note.rawFile;

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
