const { Machine, interpret, actions } = require(`xstate`);
const { send, cancel } = actions;
const path = require("path");

const chokidar = require("chokidar");

const externalMapFetcher = require("./external-map-fetcher");
const generateNodes = require("./generate-nodes");

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

  let delay = pluginOptions.timerReloadDelay || 1800000; // default to a 30 minute reload timer
  const sendTimerAfterDelay = send("TIMER", {
    delay: delay,
    id: "delayTimer", // give the event a unique ID
  });

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
                      (_, { pathType, path }) => `regenerating nodes at timer`
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
            console.log(value);
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
  console.log(externalMapsParsed);

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
