module.exports = ({ actions }) => {
  const { createTypes } = actions;

  const typeDefs = `
    type BrainNote implements Node @infer {
      title: String!
      slug: String!
      rawContent: String
      content: String
      noteTemplate: String
      aliases: [String]
      outboundReferences: [String]
      outboundReferenceNotes: [BrainNote] @link(from: "outboundReferenceNotes___NODE")
      inboundReferences: [String]
      inboundReferenceNotes: [BrainNote] @link(from: "inboundReferenceNotes___NODE")
      inboundReferencePreview: [InboundReferencePreview]
      childMdx: Mdx
    }

    type InboundReferencePreview @infer {
      source: String!
      previewHtml: String!
    }
  `;

  createTypes(typeDefs);
};
