module.exports = ({
  notesDirectory = "content/brain/", // Directory containing your brain note files
  noteTemplate = "./templates/brain.js", // Template to use for note rendering
  rootPath = "brain", // Set the root url for your site (e.g. in this case https://example.com/brain)
  rootNote = "brain", // Name of the note that will be used as the 'index' note. So in this case brain.md would generate the root page of the brain.
  mdxOtherwiseConfigured = false, // Used to resolve a bug in gatsby-plugin-mdx
}) => ({
  plugins: [
    !mdxOtherwiseConfigured && {
      resolve: `gatsby-plugin-mdx`,
    },
    "gatsby-transformer-remark",
  ].filter(Boolean),
});
