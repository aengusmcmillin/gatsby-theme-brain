const matter = require("gray-matter");
const getMarkdownNotes = require("./get-markdown-notes");
const insertLinks = require("./insert-links");
const generateSlug = require("./generate-slug");

const unified = require("unified");
const markdown = require("remark-parse");
const stringifyMd = require("remark-stringify");
const html = require("rehype-stringify");
const remark2rehype = require("remark-rehype");
const path = require("path");

const { Machine, interpret } = require(`xstate`);

const textNoEscaping = require("./text-no-escaping");

const chokidar = require("chokidar");

const http = require("http");
const url = require("url");
const externalMapFetcher = require("./external-map-fetcher");
const generateBrainMap = require("./generate-brain-map");

module.exports = generateNodes;

function generateNodes(
  actions,
  createNodeId,
  createContentDigest,
  pluginOptions,
  externalMapsParsed
) {
  let markdownNotes = getMarkdownNotes(pluginOptions);
  let { slugToNoteMap, nameToSlugMap, allReferences } = processMarkdownNotes(
    markdownNotes,
    pluginOptions
  );

  let brainMapUrl = pluginOptions.brainMapUrl || "";
  let externalInboundReferences = new Map();
  for (let mapName in externalMapsParsed) {
    let map = externalMapsParsed[mapName];
    map["externalReferences"]
      .filter((it) => {
        return it["targetSite"] == brainMapUrl;
      })
      .map(({ targetSite, targetPage, sourcePage, previewHtml }) => {
        let externalUrl = url.resolve(map["rootDomain"], sourcePage);

        if (externalInboundReferences[targetPage] == null) {
          externalInboundReferences[targetPage] = [];
        }
        externalInboundReferences[targetPage].push({
          siteName: mapName,
          sourcePage: sourcePage,
          sourceUrl: externalUrl,
          previewHtml: previewHtml,
        });
      });
  }

  let noteTemplate = pluginOptions.noteTemplate || "./templates/brain.js";
  noteTemplate = require.resolve(noteTemplate);

  let backlinkMap = new Map();

  let externalRefMap = new Map();

  allReferences.forEach(({ source, references, externalReferences }) => {
    if (references == null) return;

    references.forEach(({ text, previewMarkdown }) => {
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
            aliases: [],
            noteTemplate: noteTemplate,
            outboundReferences: [],
            inboundReferences: [],
            externalOutboundReferences: [],
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
        previewMarkdown: previewMarkdown,
      });
    });

    externalReferences.forEach(({ text, site, page }) => {
      let lower = text.toLowerCase();
      let externalMap = externalMapsParsed[site];
      if (!externalMap) {
        return;
      }
      let rootDomain = externalMap["rootDomain"];
      let externalPages = externalMap["pages"];
      let linkedPage = null;
      for (var externalPage in externalPages) {
        let aliases = externalPages[externalPage];
        if (aliases.includes(page)) {
          linkedPage = externalPage;
        }
      }
      if (linkedPage !== null) {
        let externalUrl = url.resolve(rootDomain, linkedPage);
        externalRefMap[lower] = externalUrl;
      }
    });
  });

  // Create Nodes
  let slugToNoteNodeMap = new Map();
  let rootPath = pluginOptions.rootPath || "brain";

  for (let slug in slugToNoteMap) {
    let note = slugToNoteMap[slug];

    const newRawContent = insertLinks(
      note.content,
      nameToSlugMap,
      externalRefMap,
      rootPath,
      pluginOptions
    );

    const brainNoteNode = {
      id: createNodeId(`${slug} >>> BrainNote`),
      title: note.title,
      slug: slug,
      content: newRawContent,
      rawContent: newRawContent,
      absolutePath: note.fullPath,
      noteTemplate: note.noteTemplate,
      aliases: note.aliases,
      children: [],
      parent: null,
      internal: {
        type: `BrainNote`,
        mediaType: `text/markdown`,
      },
    };

    let outboundReferences = note.outboundReferences;

    // Use the slug for easier use in queries
    let outboundReferenceSlugs = outboundReferences.map(
      (match) => nameToSlugMap[match.text.toLowerCase()]
    );

    // Remove duplicates
    brainNoteNode.outboundReferences = [...new Set(outboundReferenceSlugs)];

    let inboundReferences = backlinkMap[slug] || [];
    let inboundReferenceSlugs = inboundReferences.map(({ source }) => source);
    brainNoteNode.inboundReferences = inboundReferenceSlugs.filter(
      (a, b) => inboundReferenceSlugs.indexOf(a) === b
    );
    brainNoteNode.inboundReferencePreviews = inboundReferences.map(
      ({ source, previewMarkdown }) => {
        let linkifiedMarkdown = insertLinks(
          previewMarkdown,
          nameToSlugMap,
          externalRefMap,
          rootPath,
          pluginOptions
        );

        let previewHtml = unified()
          .use(markdown, { gfm: true, commonmark: true, pedantic: true })
          .use(remark2rehype)
          .use(html)
          .processSync(linkifiedMarkdown)
          .toString();
        return {
          source: source,
          previewMarkdown: linkifiedMarkdown,
          previewHtml: previewHtml,
        };
      }
    );

    brainNoteNode.externalInboundReferences = externalInboundReferences[slug];
    brainNoteNode.externalOutboundReferences = note.externalOutboundReferences.map(
      ({ text, site, page, previewMarkdown }) => {
        let linkifiedMarkdown = insertLinks(
          previewMarkdown,
          nameToSlugMap,
          externalRefMap,
          rootPath,
          pluginOptions
        );

        let previewHtml = unified()
          .use(markdown, { gfm: true, commonmark: true, pedantic: true })
          .use(remark2rehype)
          .use(html)
          .processSync(linkifiedMarkdown)
          .toString();
        let rootDomain = externalMapsParsed[site]["rootDomain"];

        return {
          targetSite: rootDomain,
          targetPage: page,
          previewHtml: previewHtml,
        };
      }
    );

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

  generateBrainMap(pluginOptions, slugToNoteNodeMap);
}

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
    parent: parent,
    child: tree,
  };
}

function processMarkdownNotes(markdownNotes, pluginOptions) {
  let slugToNoteMap = new Map();
  let nameToSlugMap = new Map();
  let allReferences = [];

  const additionalNoteTypes = pluginOptions.additionalNoteTypes || {};

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

    let aliases = [];
    if (frontmatter.aliases != null) {
      aliases = frontmatter.aliases;
      frontmatter.aliases
        .map((a) => a.toLowerCase())
        .forEach((alias) => {
          nameToSlugMap[alias] = slug;
        });
    }

    let noteTemplate = pluginOptions.noteTemplate || "./templates/brain.js";
    noteTemplate = require.resolve(noteTemplate);
    if (frontmatter.noteType != null) {
      let noteType = frontmatter.noteType;
      if (noteType in additionalNoteTypes) {
        noteTemplate = additionalNoteTypes[noteType];
      }
    }

    // Find matches for content between double brackets
    // e.g. [[Test]] -> Test
    const regex = /(?<=\[\[).*?(?=\]\])/g;
    let outboundReferences = [...content.matchAll(regex)] || [];
    if (pluginOptions.linkifyHashtags) {
      const hashtagRegexExclusive = /(?<=(^|\s)#)\w*\b/g;
      let hashtagReferences =
        [...content.matchAll(hashtagRegexExclusive)] || [];
      outboundReferences = outboundReferences.concat(hashtagReferences);
    }
    let internalReferences = [];
    let externalReferences = [];
    // outboundReferences =
    outboundReferences.forEach((match) => {
      let text = match[0];
      let start = match.index;
      let { parent } = findDeepestChildForPosition(null, tree, start);
      // Adding this logic to avoid including too large an amount of content. May need additional heuristics to improve this
      // Right now it essentially will just capture the bullet point or paragraph where it is mentioned.
      let maxDepth = 2;
      for (
        let i = 0;
        i < maxDepth &&
        parent.parent != null &&
        parent.parent.node.type !== "root";
        i++
      ) {
        parent = parent.parent;
      }

      let processor = unified()
        .use(stringifyMd, { commonmark: true })
        .use(textNoEscaping)
        .freeze();
      let previewMarkdown = processor.stringify(parent.node);

      const externalRefMatch = /(.*)\/(.*)/;
      let externalRef = text.match(externalRefMatch);
      if (externalRef !== null) {
        // External reference
        externalReferences.push({
          text: text,
          site: externalRef[1],
          page: externalRef[2],
          previewMarkdown: previewMarkdown,
        });
      } else {
        // Internal reference
        internalReferences.push({
          text: text,
          previewMarkdown: previewMarkdown,
        });
      }
    });
    allReferences.push({
      source: slug,
      references: internalReferences,
      externalReferences: externalReferences,
    });

    if (frontmatter.title == null) {
      frontmatter.title = slug;
    }

    slugToNoteMap[slug] = {
      title: title,
      content: rawFile,
      rawContent: rawFile,
      fullPath: fullPath,
      frontmatter: frontmatter,
      aliases: aliases,
      outboundReferences: internalReferences,
      externalOutboundReferences: externalReferences,
      noteTemplate: noteTemplate,
      inboundReferences: [],
    };
  });

  return {
    slugToNoteMap: slugToNoteMap,
    nameToSlugMap: nameToSlugMap,
    allReferences: allReferences,
  };
}
