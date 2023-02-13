+++
date = "2020-12-31T23:10:46-06:00"
categories = ["Test"]
tags = ["Test"]
title = "Test post"
hasequations = true
hascode = false
isexternal = false
series = []
description = ""
draft = true
tableofcontents = true
+++

## Markdown stuff

The quadratic solver formula is:
$(x=(-b +- \sqrt(b^2 – 4ac)) \over (2a))$

$$x=(-b +- \sqrt{b^2 – 4ac}) \over (2a)$$

Here are some **quotes**:

> This is a blockquote and it will run the entire length of this line until there
is a line break like this.
>
> This is another para of quotes.

This is a footnote[^asd]. And another one[^sdf].

[^asd]: Footnote text.
[^sdf]: This one is numbered 1 in source.

### A collapsible section with markdown

Using the `aside` shortcode:

{{< aside title >}}
Inner text
* This
* is 
    * a
    * list

> This is some quote which may run too long, but lets see how the parent accommodates it.

{{< /aside >}}

Can we do this in pure HTML instead of a shortcode?

<details>
<summary>Collapsible but in HTML</summary>
These are some details. Will markdown be rendered?

#### Lets find out

**This is bolded**. *This is italicized.*
</details>

## xorigin iframes:


<!-- {{< frame src="http://iahmed.me" >}} -->


## local iframes:

<!-- {{< frame src="/old_www/index.html" >}} -->

## rendered notebooks (markdown)

<!-- {{< read src="/static/test/sample.md" >}} -->

## rendered notebooks (html)

<!-- {{< read src="/static/test/sample.html" >}} -->

## raw code from file

```python
{{% read src="/static/test/sample.py" %}}
```
