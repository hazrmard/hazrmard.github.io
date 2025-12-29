# Design document - a contextual geopolitical timeline.

This design document describes an interactive blog post which acts like a scrollable timeline. This is a hugo blog post.

## Features

1. A JSON object (`data.json`) contains an array of objects that will be displayed.
2. Each object contains the content, any display icons, taxonomies, and background rendering instructions.
3. The background of the page will transition between the renders in the instructions as the page scrolls down. For example, a map display that zooms to different areas as the page scrolls. This is TBD.
4. There is a widget to filter the elements in the array by taxonomies. Multiple values can be selected. Taxonomies are grouped by name.
5. The interface is mobile- and SEO-friendly.
6. The app is aware of the current element being displayed. This can be used for some callbacks which modify elements based on what is being seen.
7. There is a toggle to compress entries, or to vertically space them proportional to their start times.

## Constraints

1. The html content (`app.html`) will be embdded inside a hugo markdown post (`index.md`). HTML headers are not needed (html, body tags).
2. Should not depend on a server-side build step (no node js builds).
3. The layout is top-bottom.
4. Keep styling minimal. Rely on importing existing css libraries to keep markup succinct.

## Data representation

```
[
    {
        datetime_start: // ISO formatted datetime used for ordering
        datetime_end: // Optional ISO foramtted datetime for end.
        header: // short-form string
        content: // long-form markdown string or path to markdown
        images: [] // relative links to images
        taxonomies: {[
            name: // name of taxonomy (i.e. category, country)
            value: // value of taxonomy (i.e. event, USA)
            icon: // optional icon for that value (i.e. 📅)
            hidden: // whether to display this to the user
        ]}
        bgRender: {color: } // TBD
    }
]
```

## App configuration

1. A widget to filter by taxonomies.
2. Expand / collapse detailed content.
3. Search by words.