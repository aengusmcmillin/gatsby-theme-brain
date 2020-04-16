const fs = require("fs");

exports.onPreBootstrap = require("./on-pre-bootstrap");

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type BrainNote implements Node {
      title: String!
      slug: String!
      rawContent: String
      content: String
      aliases: [String]
      outboundReferences: [String]
      inboundReferences: [String]
      childMdx: Mdx
    }

    type BrainFragment {
      pageTitle: String!
      link: String!
      previewHtml: String!
    }
  `;

  createTypes(typeDefs);
};

exports.sourceNodes = require("./source-nodes");

exports.createPages = async ({ actions, graphql }, pluginOptions) => {
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
  const brainTemplate =
    pluginOptions.brainTemplate || "./src/templates/brain.js";
  const basePage = pluginOptions.basePage || "brain";
  brain.forEach((note) => {
    var slug = note.slug;
    if (basePage == slug) {
      createPage({
        path: urlPrefix,
        component: require.resolve(brainTemplate),
        context: {
          slug: slug,
          postPath: path,
        },
      });
    }
    var path = `${urlPrefix}/${slug}`;
    createPage({
      path: path,
      component: require.resolve(brainTemplate),
      context: {
        slug: slug,
        postPath: path,
      },
    });
  });
};
