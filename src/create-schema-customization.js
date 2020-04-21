module.exports = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type BrainNote implements Node {
      title: String!
      slug: String!
      rawContent: String
      content: String
      aliases: [String]
      outboundReferences: [String]
      outboundReferenceNotes: [BrainNote]
      inboundReferences: [String]
      inboundReferenceNotes: [BrainNote]
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
