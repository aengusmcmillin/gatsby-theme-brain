# Gatsby Brain

Use this theme to integrate [Roam Research](https://roamresearch.com/) inspired bidirectional linking of notes into a network on your site.

View a demo at https://twitter.com/aengusmcmillin/status/1249845320239984640

### Note: This Theme Requires NodeJS v12

If you encounter an error along the lines of `content.matchAll(...) is not a function`, you will need to update your version of node to version 12.

## Features

### Double square bracket linking

This is the core feature of the plugin. Based on the model developed by Roam Research, the way it works is that any piece of text wrapped in double square brackets (for example [[some idea]]) will turn into a link to a page. If the page already exists in the graph it will link to that, and if not it will create the page. And when generating that page, a reference is created back to any files that link to it.

This means that you can create pages without any files backing them. They won't have any content, but they will still have the associated backlinks, which makes it incredibly easy to start linking together different notes and references based on common ideas.

For example, lets say you were writing a couple of book reviews on your site. You might create a note for each book as individual markdown files. Now, you could also create a 'books.md' file and add in links to all of your book reviews, but that would be a hassle. Instead, you can simply add something `Tags: [[Books]]` to the top of the each book as you create those notes, and a Books page will be automatically generated containing links to every one of your book reviews!

### Case insensitivity

This is one variation from Roam. In Roam, everything is case sensitive, so if you use [[Book]] and [[book]], those will link to two different places. Because of the way this theme works it didn't make sense to keep that behavior, and I personally get frustrated with it more often than not. So this theme is case insensitive. That means linking to [[Book]], [[BOOK]], and [[book]] all go to the same place.

### Add Frontmatter for titles and aliases

When generating a page from markdown, by default the title of the page will simply be the slug (filename minus extension) of the file. This is often not going to be exactly what you want due to the present of dashes and differences in capitalization. To fix this, you can add frontmatter to your markdown files with the `title` field filled in.

For example:

```
---
title: "Some Great Idea I Had"
---
```

And there is also a feature that isn't in Roam but can help a little bit with making a Public Brain more readable. It is another attribute of frontmatter called aliases. If you pass an array of strings to `aliases`, during the generation of the graph any double bracketed phrases that match one of those aliases will be linked to that note.

This can be useful for shorthands, plurals, or common misspellings. My favorite way is definitely for plurals so far though. Between this and the case insensitivity, it means you can easily set it up so that, for example, despite having a 'Books' page, you can easily write something like: "Lord of the Rings is a really good [[book]]", and not force yourself to rewrite it as "Lord of the Rings is a really good [[Books]]" for the sake of linking.

You would just make sure that your books markdown file has something like this at the top:

```
---
title: "Books"
aliases: ["book"]
---
```

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

### Extending the GraphOverview component

If you want to modify the Graph Overview page you can do so by [extending](https://www.gatsbyjs.org/docs/theme-api/#extending) the `GraphOverview` component.

Here's an example of extending the component to fill the parent and be responsive to the current theme:

```js
// src/@aengusm/gatsby-theme-brain/components/GraphOverview.js

import GraphOverview from "@aengusm/gatsby-theme-brain/src/components/GraphOverview";
import React from "react";
import { useColorMode } from "@chakra-ui/core";

import SEO from "../../../components/SEO";
import Layout from "../../../components/Layout";

export default (props) => {
  const { colorMode } = useColorMode();

  return (
    <Layout>
      <SEO title="Graph Overview" />
      <GraphOverview
        style={{ width: "100%", height: "100%" }}
        stylesheet={[
          {
            selector: "node",
            style: {
              label: "data(label)",
              color: colorMode === "light" ? "#000000" : "#ffffff",
              backgroundColor: "#545454",
              "text-wrap": "wrap",
              "text-max-width": 100,
              "font-size": 12,
            },
          },
        ]}
        {...props}
      />
    </Layout>
  );
};
```

## Usage

| Option                   | Default Value                           | Description                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notesDirectory`         | "content/brain/"                        | Directory containing your brain note files                                                                                                                                                                                                        |
| `notesFileExtensions`    | `[".md", ".mdx"]`                       | File extensions that will be used to generate pages.                                                                                                                                                                                              |
| `exclude`                | `[]`                                    | List of strings or regular expressions. Notes files whose names match these will be ignored.
| `noteTemplate`           | "./templates/brain.js"                  | Template to use for note rendering                                                                                                                                                                                                                |
| `additionalNoteTypes`    | `{}`                                    | Additional note types. This should be a mapping from a type string to a template path. (for example, {"evergreen": "./templates/evergreen.js"} would allow you to declare `noteType: "evergreen"` in your frontmatter to use that other template) |
| `rootPath`               | "brain"                                 | Set the root url for the brain on your site (e.g. in this case https://example.com/brain)                                                                                                                                                         |
| `rootNote`               | "brain"                                 | Name of the 'index' note. So in this case brain.md would generate the root page of the brain                                                                                                                                                      |
| `generateSlug`           | `(filename) => slugify(filename)`       | Function used to turn the filename of a note into its resulting slug (path)                                                                                                                                                                       |
| `graphOverviewTemplate`  | "./templates/graph-overview.js"         | Template to use for the graph overview                                                                                                                                                                                                            |
| `graphOverviewPath`      | "graph-overview"                        | The route for the graph overview (e.g. in this case https://example.com/graph-overview)                                                                                                                                                           |
| `linkifyHashtags`        | false                                   | Set to true if you want text such as `#Test` to be automatically converted into a page and link.                                                                                                                                                  |
| `hideDoubleBrackets`     | false                                   | Set to true if you want `[[Page]]` to show up as `Page` without the double brackets                                                                                                                                                               |
| `mdxOtherwiseConfigured` | false                                   | Used to workaround a bug in gatsby-plugin-mdx (see https://github.com/ChristopherBiscardi/gatsby-mdx/issues/354). Set to true if you have already configured mdx                                                                                  |
| `generateRSS`            | false                                   | Enable this to generate an RSS feed from all notes with syndicate: true in the frontmatter. If you want to test this locally you will need to do `gatsby build` and then `gatsby develop`.                                                        |
| `rssPath`                | "/brainrss.xml"                         | Adjust this to set the path of the generated RSS feed xml file                                                                                                                                                                                    |
| `rssTitle`               | "gatsby-theme-brain generated rss feed" | Adjust this to set the title of the generated RSS feed                                                                                                                                                                                            |
| `generateBrainMap`       | false                                   | Set to true to generate a map for external subscribing                                                                                                                                                                                            |
| `brainBaseUrl`           | ""                                      | Configure the base url for the gatsby-theme-brain section of your site. Used by the brain map subscribers to generate links.                                                                                                                      |
| `brainMapPath`           | "static/brainmap.json"                  | Set the path on your site where the brainmap json file will be generated                                                                                                                                                                          |
| `mappedExternalBrains`   | {}                                      | Set to an object mapping from a name that will be used in the links (e.g. [[name/somepage]]), to the url for the external brainmap                                                                                                                |
| `timerReloadDelay`       | 0                                       | Change to something greater than 0 to enable automatic reloading of the map. This is useful when subscribed to other sites to regenerate those references. Value is in milliseconds, so 6000000 would regenerate your site every 10 minutes.      |
