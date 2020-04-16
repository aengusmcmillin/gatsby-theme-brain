module.exports = ({
  path = "content/brain/",
  urlPrefix = "brain",
  brainTemplate = "./templates/brain.js",
  basePage = "brain",
}) => ({
  plugins: ["gatsby-transformer-remark", "gatsby-plugin-mdx"],
});
