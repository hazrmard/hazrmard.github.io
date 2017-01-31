---
title: Testing code with sensitive data
author: ahmedi
layout: post
date: 2016-09-06T02:01:26+00:00
categories:
  - Developer
tags:
  - git
  - powershell
  - testing

---
I recently renewed work on my first ever [github project][1]. Over the course of a whole year when that project was dormant, I&#8217;d learned some new tricks. I now try to focus on writing tests for my projects. It is immensely convenient when I add features here  and there and need to check the whole code for errors.

<p class="">
  Anyways, my project requires API keys to imgur.com. However I do not want to hard-code them into my <em><a href="https://github.com/hazrmard/imgurPCA/blob/master/test.py">test.py</a></em> file. But I also do not want to manually provide keys every time I run tests. So what do I do?<!--more-->
</p>

<p class="">
  If you develop on Windows, have you heard of our lord and savior Powershell? Powershell is a scripting environment (like cmd on steroids) akin to bash on linux. I simply wrote a PS script that substitutes keys into <em>test.py. </em>Then it runs the file, and before exiting removes the API keys again. To illustrate:
</p>

<pre class="toolbar-overlay:false lang:python decode:true" title="test.py in default state"><code>CLIENT_ID = ''
CLIENT_SECRET = ''

# my tests</code></pre>

My script that looks for `CLIENT_ID` and `CLIENT_SECRET` and inserts API keys:

<pre class="toolbar-overlay:false lang:ps decode:true " title="A powershell script to add API keys"><code>$id = "SOME_ID"
$secret = "SOME_SECRET"
$file = "test.py"

$content = Get-Content $file
$content -replace "CLIENT_ID = ''", "CLIENT_ID = '$id'" |
         % {$_.replace("CLIENT_SECRET = ''", "CLIENT_SECRET = '$secret'")} |
         Set-Content $file

python $file

 $content -replace "CLIENT_ID = '$id'", "CLIENT_ID = ''" |
          % {$_.replace("CLIENT_SECRET = '$secret'", "CLIENT_SECRET = ''")} |
          Set-Content $file
</code></pre>

Immediately after the code is run (`python $file`). The file is restored to its initial state so I can upload it to github safely.

If you already have some sensitive information uploaded to github or in your git history, check out [BFG][2]. It is a tool that can purge files/replace text from git history permanently.

 [1]: https://github.com/hazrmard/imgurPCA
 [2]: https://rtyley.github.io/bfg-repo-cleaner/
