const path = require("path");

module.exports = async ({ actions, graphql }, pluginOptions) => {
  const { createPage } = actions;
  const result = await graphql(`
    query {
      brain: allBrainNote {
        nodes {
          slug
        }
      }
    }
  `);

  const brainNotes = result.data.brain.nodes;

  const rootPath = pluginOptions.rootPath || "brain";
  const rootNote = pluginOptions.rootNote || "brain";
  const noteTemplate = pluginOptions.noteTemplate || "./templates/brain.js";
  const graphOverviewTemplate =
    pluginOptions.graphOverviewTemplate || "./templates/graph-overview.js";
  const graphOverviewPath = pluginOptions.graphOverviewPath || "graph-overview";

  brainNotes.forEach((note) => {
    let slug = note.slug;
    if (rootNote == slug) {
      createPage({
        path: rootPath,
        component: require.resolve(noteTemplate),
        context: {
          slug: slug,
        },
      });
    }

    let notePath = path.join(rootPath, slug);
    createPage({
      path: notePath,
      component: require.resolve(noteTemplate),
      context: {
        slug: slug,
      },
    });
  });

  // createPage({
  //   path: graphOverviewPath,
  //   component: require.resolve(graphOverviewTemplate),
  // });
};
