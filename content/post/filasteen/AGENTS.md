# Design document - a contextual geopolitical timeline.

This design document describes an interactive blog post which acts like a scrollable timeline.

## Features

1. A JSON object contains an array of objects that will be displayed.
2. Each object contains the content, any display icons, taxonomies, and background rendering instructions.
3. The background of the page will transition between the renders in the instructions as the page scrolls down. For example, a map display that zooms to different areas as the page scrolls.
4. There is a widget to filter the elements in the array by taxonomies.
5. The interface is mobile- and SEO-friendly.

## Constraints

1. The html content will be embdded inside a hugo markdown post. HTML headers are not needed (html, body tags).
2. Should not depend on a server-side build step (no node js builds).

## Data representation

```
[
    {
        datetime: // ISO formatted datetime used for ordering
        header: // short-form string
        content: // long-form string
        images: [] // relative links to images
        taxonomies: {
            name: // name of taxonomy (i.e. category, country)
            value: // value of taxonomy (i.e. event, USA)
            icon: // optional icon for that value (i.e. 📅)
        }
        bgRender: // TBD
    }
]
```