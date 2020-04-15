module.exports = ({
  path = "content/brain/",
  urlPrefix = "brain",
  brainTemplate = "./src/templates/brain.js",
  basePage = "brain",
}) => ({
  plugins: ["gatsby-transformer-remark", "gatsby-plugin-mdx"],
});
