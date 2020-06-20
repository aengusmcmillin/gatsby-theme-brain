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

const { Machine, interpret, actions } = require(`xstate`);
const { send, cancel } = actions;

const textNoEscaping = require("./text-no-escaping");

const chokidar = require("chokidar");

const http = require("http");
const url = require("url");
const externalMapFetcher = require("./external-map-fetcher");
const generateBrainMap = require("./generate-brain-map");

const createFSMachine = (
  { actions, createNodeId, createContentDigest, reporter },
  pluginOptions,
  externalMapsParsed
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
              pluginOptions,
              externalMapsParsed
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

  let delay = pluginOptions.timerReloadDelay || 0; // default to not auto reloading
  let sendTimerAfterDelay;
  if (delay > 0) {
    sendTimerAfterDelay = send("TIMER", {
      delay: delay,
      id: "delayTimer", // give the event a unique ID
    });
  } else {
    const defaultLog = (_, ...args) => `unset logging with ${args}`;
    sendTimerAfterDelay = log(defaultLog);
  }

  const cancelTimer = cancel("delayTimer"); // pass the ID of event to cancel

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
              entry: sendTimerAfterDelay,
              on: {
                TIMER: {
                  actions: [
                    `refetchExternalMapsAndRegenerate`,
                    cancelTimer,
                    sendTimerAfterDelay,
                    log(
                      (_, { pathType, path }) =>
                        `regenerating nodes after delay`
                    ),
                  ],
                },
                CHOKIDAR_ADD: {
                  actions: [
                    `generateNodes`,
                    cancelTimer,
                    sendTimerAfterDelay,
                    log(
                      (_, { pathType, path }) => `added ${pathType} at ${path}`
                    ),
                  ],
                },
                CHOKIDAR_CHANGE: {
                  actions: [
                    `generateNodes`,
                    cancelTimer,
                    sendTimerAfterDelay,
                    log(
                      (_, { pathType, path }) =>
                        `changed ${pathType} at ${path}`
                    ),
                  ],
                },
                CHOKIDAR_UNLINK: {
                  actions: [
                    `generateNodes`,
                    cancelTimer,
                    sendTimerAfterDelay,
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
        refetchExternalMapsAndRegenerate(_) {
          let externalMaps = pluginOptions.mappedExternalBrains || {};
          externalMapFetcher(externalMaps).then((value) => {
            externalMapsParsed = value;
            generateNodes(
              actions,
              createNodeId,
              createContentDigest,
              pluginOptions,
              externalMapsParsed
            );
          });
        },
        generateNodes(_) {
          generateNodes(
            actions,
            createNodeId,
            createContentDigest,
            pluginOptions,
            externalMapsParsed
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

module.exports = async (api, pluginOptions) => {
  let externalMaps = pluginOptions.mappedExternalBrains || {};
  let externalMapsParsed = await externalMapFetcher(externalMaps);

  const fsMachine = createFSMachine(api, pluginOptions, externalMapsParsed);

  api.emitter.on(`BOOTSTRAP_FINISHED`, () => {
    fsMachine.send(`BOOTSTRAP_FINISHED`);
  });

  generateNodes(
    api.actions,
    api.createNodeId,
    api.createContentDigest,
    pluginOptions,
    externalMapsParsed
  );

  const notesDirectory = pluginOptions.notesDirectory || "content/brain/";
  const watchPath = path.resolve(process.cwd(), notesDirectory);
  const watcher = chokidar.watch(watchPath);

  watcher.on(`add`, (path) => {
    fsMachine.send({ type: `CHOKIDAR_ADD`, pathType: `file`, path });
  });

  watcher.on(`change`, (path) => {
    fsMachine.send({
      type: `CHOKIDAR_CHANGE`,
      pathType: `file`,
      path,
    });
  });

  watcher.on(`unlink`, (path) => {
    fsMachine.send({
      type: `CHOKIDAR_UNLINK`,
      pathType: `file`,
      path,
    });
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
  pluginOptions,
  externalMapsParsed
) {
  let markdownNotes = getMarkdownNotes(pluginOptions);
  let { slugToNoteMap, nameToSlugMap, allReferences } = processMarkdownNotes(
    markdownNotes,
    pluginOptions,
    externalMapsParsed
  );

  let brainBaseUrl = pluginOptions.brainBaseUrl || "";
  let externalInboundReferences = new Map();
  for (let mapName in externalMapsParsed) {
    let map = externalMapsParsed[mapName];
    map["externalReferences"]
      .filter((it) => {
        return it["targetSite"] == brainBaseUrl;
      })
      .map(({ targetSite, targetPage, sourcePage, previewHtml }) => {
        let externalUrl = url.resolve(map["rootDomain"], sourcePage);
        targetPage = nameToSlugMap[generateSlug(targetPage)];

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
      path.join("/", rootPath, "/"),
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
          path.join("/", rootPath, "/"),
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
          brainBaseUrl,
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

  let shouldGenerateBrainMap = pluginOptions.generateBrainMap || false;
  if (shouldGenerateBrainMap) {
    generateBrainMap(pluginOptions, slugToNoteNodeMap);
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

function processMarkdownNotes(
  markdownNotes,
  pluginOptions,
  externalMapsParsed
) {
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
        if (externalMapsParsed[externalRef[1]]) {
          // External reference
          externalReferences.push({
            text: text,
            site: externalRef[1],
            page: externalRef[2],
            previewMarkdown: previewMarkdown,
          });
        }
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
