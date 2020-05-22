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

const createFSMachine = (
  { actions, createNodeId, createContentDigest, reporter },
  pluginOptions
) => {
  // For every path that is reported before the 'ready' event, we throw them
  // into a queue and then flush the queue when 'ready' event arrives.
  // After 'ready', we handle the 'add' event without putting it into a queue.
  let pathQueue = [];
  const flushPathQueue = () => {
    let queue = pathQueue.slice();
    pathQueue = null;
    return Promise.all(
      // eslint-disable-next-line consistent-return
      queue.map(({ op, path }) => {
        switch (op) {
          case `delete`:
          case `upsert`:
            return generateNodes(
              actions,
              createNodeId,
              createContentDigest,
              pluginOptions
            );
        }
      })
    );
  };

  const log = (expr) => (ctx, action, meta) => {
    if (meta.state.matches(`BOOTSTRAP.BOOTSTRAPPED`)) {
      reporter.info(expr(ctx, action, meta));
    }
  };

  const fsMachine = Machine(
    {
      id: `fs`,
      type: `parallel`,
      states: {
        BOOTSTRAP: {
          initial: `BOOTSTRAPPING`,
          states: {
            BOOTSTRAPPING: {
              on: {
                BOOTSTRAP_FINISHED: `BOOTSTRAPPED`,
              },
            },
            BOOTSTRAPPED: {
              type: `final`,
            },
          },
        },
        CHOKIDAR: {
          initial: `NOT_READY`,
          states: {
            NOT_READY: {
              on: {
                CHOKIDAR_READY: `READY`,
                CHOKIDAR_ADD: { actions: `queueNodeProcessing` },
                CHOKIDAR_CHANGE: { actions: `queueNodeProcessing` },
                CHOKIDAR_UNLINK: { actions: `queueNodeDeleting` },
              },
              exit: `flushPathQueue`,
            },
            READY: {
              on: {
                CHOKIDAR_ADD: {
                  actions: [
                    `generateNodes`,
                    log(
                      (_, { pathType, path }) => `added ${pathType} at ${path}`
                    ),
                  ],
                },
                CHOKIDAR_CHANGE: {
                  actions: [
                    `generateNodes`,
                    log(
                      (_, { pathType, path }) =>
                        `changed ${pathType} at ${path}`
                    ),
                  ],
                },
                CHOKIDAR_UNLINK: {
                  actions: [
                    `generateNodes`,
                    log(
                      (_, { pathType, path }) =>
                        `deleted ${pathType} at ${path}`
                    ),
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        generateNodes(_) {
          generateNodes(
            actions,
            createNodeId,
            createContentDigest,
            pluginOptions
          );
        },
        flushPathQueue(_, { resolve, reject }) {
          flushPathQueue().then(resolve, reject);
        },
        queueNodeDeleting(_, { path }) {
          pathQueue.push({ op: `delete`, path });
        },
        queueNodeProcessing(_, { path }) {
          pathQueue.push({ op: `upsert`, path });
        },
      },
    }
  );
  return interpret(fsMachine).start();
};

module.exports = (api, pluginOptions) => {
  const fsMachine = createFSMachine(api, pluginOptions);

  api.emitter.on(`BOOTSTRAP_FINISHED`, () => {
    fsMachine.send(`BOOTSTRAP_FINISHED`);
  });
  generateNodes(
    api.actions,
    api.createNodeId,
    api.createContentDigest,
    pluginOptions
  );

  const notesDirectory = pluginOptions.notesDirectory || "content/brain/";
  const watchPath = path.resolve(process.cwd(), notesDirectory);
  const watcher = chokidar.watch(watchPath);

  watcher.on(`add`, (path) => {
    fsMachine.send({ type: `CHOKIDAR_ADD`, pathType: `file`, path });
  });

  watcher.on(`change`, (path) => {
    fsMachine.send({ type: `CHOKIDAR_CHANGE`, pathType: `file`, path });
  });

  watcher.on(`unlink`, (path) => {
    fsMachine.send({ type: `CHOKIDAR_UNLINK`, pathType: `file`, path });
  });

  return new Promise((resolve, reject) => {
    watcher.on(`ready`, () => {
      fsMachine.send({ type: `CHOKIDAR_READY`, resolve, reject });
    });
  });
};

function generateNodes(
  actions,
  createNodeId,
  createContentDigest,
  pluginOptions
) {
  let markdownNotes = getMarkdownNotes(pluginOptions);
  let { slugToNoteMap, nameToSlugMap, allReferences } = processMarkdownNotes(
    markdownNotes,
    pluginOptions
  );

  let noteTemplate = pluginOptions.noteTemplate || "./templates/brain.js";
  noteTemplate = require.resolve(noteTemplate);

  let backlinkMap = new Map();

  allReferences.forEach(({ source, references }) => {
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
            noteTemplate: noteTemplate,
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
        previewMarkdown: previewMarkdown,
      });
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

    if (frontmatter.aliases != null) {
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
    outboundReferences = outboundReferences.map(function (match) {
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

      return {
        text: text,
        previewMarkdown: previewMarkdown,
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
      content: rawFile,
      rawContent: rawFile,
      fullPath: fullPath,
      frontmatter: frontmatter,
      outboundReferences: outboundReferences,
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
