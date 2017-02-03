---
title: Parsing websites on a budget
author: ahmedi
layout: post
date: 2015-07-23T01:32:40+00:00
categories:
  - Developer
tags:
  - javascript
  - web app
  - web scraping
  - YQL
hasequations: false
hascode: true
---
Say you are an up and coming web developer. You want to make a web app that can access content on other sites. Perhaps you want to make a word cloud from a news article on BBC. Or you want to see what videos a site has embedded within itself. You could achieve that by doing some server side voodoo. The &#8216;standard&#8217; way to go about it would be to download the site to your server and then serve its contents to your webpage.  But that would require two things:<!--more-->

  1. Having enough bandwidth
  2. Knowing a server side language

Say, hypothetically, that you fulfil none of these requirements. What now? Well, you can try to bypass the server and extract the website&#8217;s contents directly to your page. But that won&#8217;t work. All thanks to the <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy" target="_blank">Same Origin Policy</a>. So most, if not all, attempts you make to read content from another domain will be denied by your browser (_<a href="http://security.stackexchange.com/questions/8264/why-is-the-same-origin-policy-so-important" target="_blank">read more: why is this important?</a>_).  Another approach would be to use iframe elements in your page to load foreign content. But that technique can be used maliciously (if, for example, someone superimposes a hidden PayPal pay button in an iframe on top of another visible button). So many sites have scripts in place to detect if they are being displayed in an iframe and measures to prevent that.

It seems hopeless! But despair not, you do what I did: harness the almighty power of <a href="https://developer.yahoo.com/yql" target="_blank">Yahoo! Query Language (YQL)</a>. YQL is like SQL &#8211; but with a &#8216;Y&#8217;. And where SQL queries tables for information, YQL queries web pages (among other things) for information. So, for example to extract hyperlinks, the query would be:

<p style="text-align: center;">
  <code>select * from html where url='http://en.wikipedia.org/wiki/Yahoo' and xpath='//a'</code>
</p>

<p style="text-align: left;">
  And you can put that query in an <a href="http://www.w3schools.com/ajax/ajax_xmlhttprequest_send.asp" target="_blank">XMLHttpRequest (XHR)</a> using the endpoint specified in the YQL documentation to get your results. So for the above query the XHR URL would be:
</p>

  <pre><code>https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D'http%3A%2F%2Fen.wikipedia.org%2Fwiki%2FYahoo'%20and%20xpath%3D'%2F%2Fa'&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys</code></pre>

<p style="text-align: left;">
  The <a href="https://developer.yahoo.com/yql/" target="_blank">YQL</a> page will give you the URL for any request you make. And then you can use that as a template in your web app. Yay! You can see an implementation of this in a project of mine: <a href="http://lab.iahmed.me/webweb" target="_blank">WebWeb</a> (<code>&lt;a href="https://github.com/hazrmard/WebWeb" target="_blank">source code&lt;/a></code>). Happy coding!
</p>
