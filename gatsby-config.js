module.exports = {
  plugins: [ 
    "gatsby-plugin-emotion",
    "gatsby-transformer-remark",
    {
      resolve: "gatsby-plugin-mdx",
      options: {
        gatsbyRemarkPlugins: [
          {
            resolve: "gatsby-remark-images",
            options: {
              maxWidth: 1380,
              linkImagesToOriginal: false,
            },
          },
          {
            resolve: "gatsby-remark-embed-video",
            options: {
              width: "560",
              related: false, //Optional: Will remove related videos from the end of an embedded YouTube video.
              noIframeBorder: true, //Optional: Disable insertion of <style> border: 0
            },
          },
        ],
      },
    },
  ]
}