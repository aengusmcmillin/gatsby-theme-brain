const url = require("url");
const path = require("path");

module.exports = ({
  notesDirectory = "content/brain/", // Directory containing your brain note files
  notesFileExtensions = [".md", ".mdx"], // File extensions that will be used to generate pages
  noteTemplate = "./templates/brain.js", // Template to use for note rendering
  additionalNoteTypes = {}, // Mapping object from note type keys to template paths
  rootPath = "brain", // Set the root url for your site (e.g. in this case https://example.com/brain)
  rootNote = "brain", // Name of the note that will be used as the 'index' note. So in this case brain.md would generate the root page of the brain.
  mdxOtherwiseConfigured = false, // Used to resolve a bug in gatsby-plugin-mdx
  linkifyHashtags = false, // Enable this if you want to link hashtags. E.g. #Test would link to (and create if needed) https://example.com/brain/test
  hideDoubleBrackets = false, // Enable this if you want to hide the double brackets that are converted to links (e.g. [[page]] turns into [page](https://example.com/brain/page))
  generateRSS = false, // Enable this to generate an RSS feed from all notes with syndicate: true in the frontmatter
  rssPath = "/brainrss.xml", // Adjust this to set the RSS output path
  rssTitle = "gatsby-theme-brain generated rss feed", // Adjust this to set the title of the generated RSS feed
}) => ({
  plugins: [
    !mdxOtherwiseConfigured && {
      resolve: `gatsby-plugin-mdx`,
    },
    "gatsby-transformer-remark",
    generateRSS && {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, notes } }) => {
              return notes.nodes.map((note) => {
                let notePath = url.resolve(
                  site.siteMetadata.siteUrl,
                  path.join(rootPath, note.slug)
                );
                return Object.assign({}, note.childMdx.frontmatter, {
                  description: note.childMdx.excerpt,
                  date: note.childMdx.frontmatter.date,
                  url: notePath,
                  guid: notePath,
                  custom_elements: [{ "content:encoded": note.childMdx.html }],
                });
              });
            },
            query: `
            {
              notes: allBrainNote(
                filter: {childMdx: {frontmatter: {syndicate: {eq: true}}}}, 
                sort: {fields: childMdx___frontmatter___date, order: DESC}
              ) {
                nodes {
                  slug
                  childMdx {
                    frontmatter {
                      date
                      title
                    }
                    excerpt
                    html
                  }
                }
              }
            }
            `,
            output: rssPath,
            title: rssTitle,
          },
        ],
      },
    },
  ].filter(Boolean),
});
