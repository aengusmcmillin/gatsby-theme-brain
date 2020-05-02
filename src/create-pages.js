const path = require("path");

module.exports = async ({ actions, graphql }, pluginOptions) => {
  const { createPage } = actions;
  const result = await graphql(`
    query {
      brain: allBrainNote {
        nodes {
          slug
          noteTemplate
        }
      }
    }
  `);

  const brainNotes = result.data.brain.nodes;

  const rootPath = pluginOptions.rootPath || "brain";
  const rootNote = pluginOptions.rootNote || "brain";
  const graphOverviewTemplate =
    pluginOptions.graphOverviewTemplate || "./templates/graph-overview.js";
  const graphOverviewPath = pluginOptions.graphOverviewPath || "graph-overview";

  brainNotes.forEach((note) => {
    let slug = note.slug;
    if (rootNote == slug) {
      createPage({
        path: rootPath,
        component: path.resolve(note.noteTemplate),
        context: {
          slug: slug,
        },
      });
    }

    let notePath = path.join(rootPath, slug);
    createPage({
      path: notePath,
      component: path.resolve(note.noteTemplate),
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
