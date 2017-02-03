---
title: Developing with C/C++ on console
author: ahmedi
layout: post
date: 2016-01-30T04:30:28+00:00
categories:
  - Developer
tags:
  - bash
  - C/C++
  - linux
hasequations: false
hascode: true
---
<p class="">
  I am taking a High Performance Computing course this semester. For that we have to <span class="lang:default decode:true  crayon-inline ">ssh</span> into the university&#8217;s computing cluster. The interface is entirely console based. Now that might seem awesome at first: typing away commands like a &#8220;hacker&#8221;. And it is awesome. But after a while it gets tiring, particularly when I am writing code.<!--more-->
</p>

<p class="">
  With C/C++, source files are compiled into an executable. Then the program can be run. This usually takes two sets of commands:
</p>

<pre class="lang:default decode:true ">$ g++ &lt;file.cpp&gt; -o &lt;executable_name&gt;
$ ./&lt;executable_name&gt;</pre>

But then I discovered the wonders of <span class="lang:default decode:true  crayon-inline">bash</span> commands.  <span class="lang:default decode:true  crayon-inline">Bash</span>  is the environment of the Linux terminal. It lets you define functions that you can call later. The function I wrote was:

<pre class="lang:sh decode:true "><code>cpp() {
        local fname=$1
        local exe_name=${fname/.cpp/.exe}
        echo "$(tput setaf 3)Compiling: " $fname "-&gt; " $exe_name"; args=&gt;[${@:2}]$(tput sgr0)"
        g++ $1 -o $exe_name
        ./$exe_name "${@:2}"
}
</code></pre>

I put this function in my <span class="lang:sh decode:true  crayon-inline ">.bashrc</span> file so it&#8217;s available whenever I log in to my terminal. With this function,  I can just pass the <span class="lang:sh decode:true  crayon-inline ">.cpp</span> file as an argument along with other command line arguments. The function compiles and runs the source file together:

<pre class="lang:sh decode:true "><code>$ cpp &lt;source_file.cpp&gt; &lt;any arguments&gt;</code></pre>

Viola!
