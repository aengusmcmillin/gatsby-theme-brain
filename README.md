# Gatsby Brain

Use this theme to integrate [Roam Research](https://roamresearch.com/) inspired bidirectional linking of notes into a network on your site.

View a demo at https://twitter.com/aengusmcmillin/status/1249845320239984640

## Installation

To use this theme in your Gatsby site:

1. Install the theme

```
npm install --save @aengusm/gatsby-theme-brain
```

2. Add the theme to your `gatsby-config.js`:

```
module.exports = {
  plugins: ['@aengusm/gatsby-theme-brain'],
};
```

3. Add content to Your Brain by creating a content/brain/ folder in the root of your site and adding markdown files to it. Use [[This Format]] to generate pages and links between pages.

4. Start your site:

```
gatsby develop
```

## Styling

For now the way to style this theme is with [component shadowing](https://www.gatsbyjs.org/blog/2019-04-29-component-shadowing/). There is a single component that renders the layout for each brain note in src/components/BrainNote.js. If you wish to shadow this and create your own version, create the file src/@aengusm/gatsby-theme-brain/components/BrainNote.js. That will shadow the existing component and you can do whatever you want with it.

If you want an example of how I shadow this, checkout my [websites github](https://github.com/aengusmcmillin/aengusmcmillin.com/blob/master/src/%40aengusm/gatsby-theme-brain/components/BrainNote.js)

## Usage

| Option                   | Default Value          | Description                                                                                                                                                      |
| ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notesDirectory`         | "content/brain/"       | Directory containing your brain note files                                                                                                                       |
| `noteTemplate`           | "./templates/brain.js" | Template to use for note rendering                                                                                                                               |
| `rootPath`               | "brain"                | Set the root url for the brain on your site (e.g. in this case https://example.com/brain)                                                                        |
| `rootNote`               | "brain"                | Name of the 'index' note. So in this case brain.md would generate the root page of the brain                                                                     |
| `generateSlug`               | `(filename) => slugify(filename)`                | Function used to turn the filename of a note into its resulting slug (path)                                                                     |
| `mdxOtherwiseConfigured` | false                  | Used to workaround a bug in gatsby-plugin-mdx (see https://github.com/ChristopherBiscardi/gatsby-mdx/issues/354). Set to true if you have already configured mdx |
