const matter = require("gray-matter");
const getMarkdownNotes = require("./get-markdown-notes");
const insertLinks = require("./insert-links");
const generateSlug = require("./generate-slug");

const unified = require("unified");
const markdown = require("remark-parse");
const html = require("rehype-stringify");
var toHast = require("mdast-util-to-hast");

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

    references.forEach(({ text, previewHtml }) => {
      let reference = text;
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
      backlinkMap[slug].push({
        source: source,
        previewHtml: previewHtml,
      });
    });
  });

  // Create Nodes
  let slugToNoteNodeMap = new Map();
  let rootPath = pluginOptions.rootPath || "brain";

  for (let slug in slugToNoteMap) {
    let note = slugToNoteMap[slug];

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
    brainNoteNode.outboundReferences = outboundReferences
      // Use the slug for easier use in queries
      .map((match) => nameToSlugMap[match.text.toLowerCase()])
      // Filter duplicates
      .filter((a, b) => outboundReferences.indexOf(a) === b);

    let inboundReferences = backlinkMap[slug] || [];
    let inboundReferenceSlugs = inboundReferences.map(({ source }) => source);
    brainNoteNode.inboundReferences = inboundReferenceSlugs.filter(
      (a, b) => inboundReferenceSlugs.indexOf(a) === b
    );
    brainNoteNode.inboundReferencePreviews = inboundReferences;

    brainNoteNode.internal.contentDigest = createContentDigest(brainNoteNode);

    slugToNoteNodeMap[slug] = brainNoteNode;
  }

  const { createNode } = actions;
  for (let slug in slugToNoteNodeMap) {
    let brainNoteNode = slugToNoteNodeMap[slug];

    let outboundReferenceNoteIds = brainNoteNode.outboundReferences.map(
      (matchSlug) => slugToNoteNodeMap[matchSlug].id
    );
    brainNoteNode.outboundReferenceNotes___NODE = outboundReferenceNoteIds;

    let inboundReferenceNoteIds = brainNoteNode.inboundReferences.map(
      (matchSlug) => slugToNoteNodeMap[matchSlug].id
    );
    brainNoteNode.inboundReferenceNotes___NODE = inboundReferenceNoteIds;

    createNode(brainNoteNode);
  }
};

function findDeepestChildForPosition(parent, tree, position) {
  if (!tree.children || tree.children.length == 0) {
    return {
      parent: parent,
      child: tree,
    };
  }

  for (child of tree.children) {
    if (
      child.position.start.offset <= position &&
      child.position.end.offset >= position
    ) {
      return findDeepestChildForPosition(
        {
          parent: parent,
          node: tree,
        },
        child,
        position
      );
    }
  }
  return {
    parent: tree,
    child: null,
  };
}

function processMarkdownNotes(markdownNotes) {
  let slugToNoteMap = new Map();
  let nameToSlugMap = new Map();
  let allReferences = [];

  markdownNotes.forEach(({ slug, fullPath, rawFile }) => {
    let fileContents = matter(rawFile);
    let content = fileContents.content;
    let frontmatter = fileContents.data;
    var tree = unified().use(markdown).parse(content);

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

    // Find matches for content between double brackets
    // e.g. [[Test]] -> Test
    const regex = /(?<=\[\[).*?(?=\]\])/g;
    let outboundReferences = [...content.matchAll(regex)] || [];
    outboundReferences = outboundReferences.map(function (match) {
      let text = match[0];
      let length = text.length;
      let start = match.index;
      let end = start + length;
      let { parent, child } = findDeepestChildForPosition(null, tree, start);
      let maxDepth = 4; // Adding this logic to avoid including too large an amount of content. May need additional heuristics to improve this
      for (
        let i = 0;
        i < maxDepth &&
        parent.parent != null &&
        parent.parent.node.type !== "root";
        i++
      ) {
        parent = parent.parent;
      }

      let previewHtml = unified().use(html).stringify(toHast(parent.node));

      return {
        text: text,
        length: length,
        start: start,
        end: end,
        previewHtml: previewHtml,
      };
    });
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
