module.exports = ({
  notesDirectory = "content/brain/", // Directory containing your brain note files
  notesFileExtensions = [".md", ".mdx"], // File extensions that will be used to generate pages
  noteTemplate = "./templates/brain.js", // Template to use for note rendering
  rootPath = "brain", // Set the root url for your site (e.g. in this case https://example.com/brain)
  rootNote = "brain", // Name of the note that will be used as the 'index' note. So in this case brain.md would generate the root page of the brain.
  mdxOtherwiseConfigured = false, // Used to resolve a bug in gatsby-plugin-mdx
  linkifyHashtags = false, // Enable this if you want to link hashtags. E.g. #Test would link to (and create if needed) https://example.com/brain/test
}) => ({
  plugins: [
    !mdxOtherwiseConfigured && {
      resolve: `gatsby-plugin-mdx`,
    },
    "gatsby-transformer-remark",
  ].filter(Boolean),
});
