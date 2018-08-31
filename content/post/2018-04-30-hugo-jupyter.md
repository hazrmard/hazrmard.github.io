+++
title = 'Hugo and Jupyter Notebooks'
date = '2018-04-30T02:51:16-05:00'
description = ""
tags = ["hugo", "web development"]
categories = ["developer"]
series = ["Hugo site development"]
isexternal = false
hasequations = false
hascode = true
draft = false
+++

[Hugo][1] is a static site generator. It takes a bunch of markdown files and renders them to HTML. It is fast and simple.

![md2html](/notebooks/../img/posts/hugo-jupyter/md-to-html.png)

[Jupyter Notebooks][2] are an interactive front-end for python (with support for other languages too). They execute code, display its output, and render markdown all in a browser window. The notebooks are a neat compilation of formatted code and text generated as HTML.

![jupyter2html](/notebooks/../img/posts/hugo-jupyter/jupyter-to-html.png)

I use Hugo for my site. I use Jupyter Notebooks to quickly prototype ideas or troubleshoot code. Wouldn't it be nice if there were a way to tell Hugo to take my Jupyter Notebooks and render them as static HTML pages on my site?

A less convenient alternative would be to simply link the notebooks for download, or use an external service (like [NBViewer][3]) to render notebooks each time someone visits my site.

I wrote a script that takes my Jupyter notebooks and converts them to markdown and/or html. I can then either add them as a standard Hugo post or embed/append them to existing posts.

![jupyter2md2html](/notebooks/../img/posts/hugo-jupyter/jupyter-to-md-to-html.png)

The script `notebook.py` runs from the root directory of the hugo site. It detects all Jupyter notebooks in the `static/notebooks/` directory. The name of the notebooks must be identical to the markdown file that is to be created/appended to.

Indeed, this post was written on Jupyter notebook. I then used the command:

```
> python notebook.py --files 2018-04-30-hugo-jupyter  # filename w/o extension
                     --to md                          # convert to markdown
                     --force                          # overwrite existing .md
                     --embed                          # embed instead of append
```

The script then placed the converted markdown into `post/2018-04-30-hugo-jupyter.md`. Since I used the `--embed` flag, the markdown was placed in the output file, replacing any exisiting contents (instead of appending to the end). Since I used the `--force` flag, no error was raised if a file with the name already existed. Providing a `--section NAME` flag will place the output in another section besides the default `post`.

With this script, I can add hugo directives/shortcodes in Jupyter notebook. They are then rendered by Hugo in the final stage of my site generation.

For example, at the end of this post, I have a shortcode to render my script as python:


```python
{{< read src="/notebooks.py" >}}
```
