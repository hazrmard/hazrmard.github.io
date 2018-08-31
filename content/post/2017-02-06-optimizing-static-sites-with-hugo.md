+++
categories = ["Developer", "Meta"]
date = "2017-02-06T10:07:58-06:00"
hasequations = false
title = "Optimizing static sites with hugo"
hascode = true
isexternal = false
series = ["Hugo site development"]
description = ""
tags = ["Javascript", "Hugo", "Web development"]
draft = false

+++
According to [httparchive](http://httparchive.org/trends.php) the average size
of a web page in 2016 was around 2.5MB. Now this may not seem a lot in this age
where the internet is the primary media delivery platform - but it is worth
noting that most web pages serve text as their primary content. Looking at the
report sheds light on what constitutes an average web page:

The HTML content takes up around 50-60kB. Images, understandably, make up the
biggest chunk with ~1.6MB. Around another ~200kB are taken up by CSS and Font
files. What is surprising to me is that the next biggest chunk, at above 400kB,
is JavaScript.

<figure>
    <img src="/img/posts/optimizing-static-sites-with-hugo/chart.png">
</figure>

The portion I want to go after is `JavaScript`. Granted that JavaScript is
indispensable to web development. However in excess it can weigh everything
down. Particularly in cases when it - instead of `CSS` -  is used to add
responsivity to a website. In my experience `jQuery` is the biggest culprit
of unnecessary bloat. But I digress.

While I was building this website using [Hugo](https://gohugo.io) I realized
that I would need additional JavaScript libraries for highlighting code and
rendering math. And these libraries take up a ton of space. This:

* Increases the bandwidth cost for the user, and
* Increases loading times which make browsing experience clunky.

<figure>
    <img src="/img/posts/optimizing-static-sites-with-hugo/network_stats.png">
    <figcaption>An overview of network traffic for a webpage on this site using
        MathJax library</figcaption>
</figure>

Above is network traffic for a page on this site that uses 3rd party JS libraries
to render equations. Around 200/218kB of network traffic is for that one library.
This may seem a trivial amount of data but I believe that any optimization is
good optimization (_in production especially_). So I harnessed all the flexibility
a static site can offer. When I now build my site, only pages that render
equations or contain code request external libraries. Thus different pages on my
site have different - but the leanest possible - network traffic signatures.

How did I do it? When building sites using Hugo, for each post I can define
variables that Hugo can use while rendering a page template into HTML. These
variables are called _front matter_ in Hugo-speak. For example, _front matter_
for this page looks like:

```toml
+++
categories = ["Developer", "Meta"]
date = "2017-02-03T10:07:58-06:00"
hasequations = false
title = "Optimizing static sites with hugo"
hascode = true
isexternal = false
series = []
description = ""
tags = ["Javascript", "Hugo"]
draft = true
+++
```

And the `<head>` section for the HTML template looks like this:

```HTML
{{if .IsPage}}
    {{if .Params.hascode}}
        <script src="https://V_V_LONG_PATH_TO_LIBRARY/highlight.min.js"></script>
        <link rel="stylesheet" type="text/css" href="https://EVEN_LONGER_PATH.min.css">
        <script>hljs.initHighlightingOnLoad();</script>
    {{end}}
    {{if .Params.hasequations}}
        <script type="text/javascript" async
            src="https://DECENT_LENGTH_PATH/MathJax.js?config=TeX-AMS_CHTML">
        </script>
    {{end}}
{{end}}
```

So now, only when I set `hasequations` to `true` does the page load
[`MathJax`](https://www.mathjax.org/). Same with `hascode` and
[`Highlight.js`](https://highlightjs.org/). This speeds up my load times and
frees up the generous CDNs from unnecessary traffic. All it took was a few lines.
Win-Win.
