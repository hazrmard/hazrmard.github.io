# Design document - a contextual geopolitical timeline.

This design document describes an interactive blog post which acts like a scrollable timeline. This is a hugo blog post.

## Features

1. A JSON object (`data.json`) contains an array of objects that will be displayed, including taxonomy references. Another JSON `taxonomies.json` contains taxonomy details (such as display icon / type.)
2. Each entry in data JSON contains the content, images, taxonomies, and background rendering instructions.
3. An entry can have short-form content, or link to an array of files containing details. Both are markdown. If provided, the details content is listed in summary blocks.
4. There is a widget to filter the elements in the array by taxonomies. Multiple values can be selected. Taxonomies are grouped by name.
5. The interface is mobile- and SEO-friendly.
6. The app is aware of the current etries(s) being displayed and in the viewport. This can be used for some callbacks which modify elements based on what is being seen.
7. There is a toggle to compress entries, or to vertically space them proportional to their start times.

## Constraints

1. The html content (`app.html`) will be embdded inside a hugo markdown post (`index.md`). HTML headers are not needed (html, body tags).
2. Should not depend on a server-side build step (no node js builds).
3. The layout is top-bottom.
4. Keep styling minimal. Rely on importing existing css libraries to keep markup succinct.

## Data representation

```
// data.json
[
    {
        datetime_start: // ISO formatted datetime used for ordering
        datetime_end: // Optional ISO foramtted datetime for end.
        header: // short-form string
        content: // long-form markdown string or path to markdown
        details: // list of markdown files to render
        images: [] // relative links to images
        taxonomies: [] // taxonomy references
        bgRender: {color: } // TBD
    }
]

// taxonomies.json
{
    taxonomy_reference: {
        name: // type
        value:
        icon:
    }
}
```

## App configuration

1. A widget to filter by taxonomies.
2. Expand / collapse detailed content.
3. Search by words.