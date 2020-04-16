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

  const brain = result.data.brain.nodes;
  const urlPrefix = pluginOptions.urlPrefix || "brain";
  const brainTemplate = pluginOptions.brainTemplate || "./templates/brain.js";
  const basePage = pluginOptions.basePage || "brain";
  brain.forEach((note) => {
    var slug = note.slug;
    if (basePage == slug) {
      createPage({
        path: urlPrefix,
        component: require.resolve(brainTemplate),
        context: {
          slug: slug,
          postPath: urlPrefix,
        },
      });
    }
    var postPath = `${urlPrefix}/${slug}`;
    createPage({
      path: postPath,
      component: require.resolve(brainTemplate),
      context: {
        slug: slug,
        postPath: postPath,
      },
    });
  });
};
