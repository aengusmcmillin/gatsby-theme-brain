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
      inboundReferencePreview: [InboundReferencePreview]
      childMdx: Mdx
    }

    type InboundReferencePreview {
      source: String!
      previewHtml: String!
    }
  `;

  createTypes(typeDefs);
};
