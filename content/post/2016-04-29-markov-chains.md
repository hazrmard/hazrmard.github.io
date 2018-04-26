---
title: Markov Chains – Random Text Generation
date: 2016-04-29T23:23:16+00:00
description : ""
categories:
  - machine learning
tags:
  - C++
  - hpc
  - markov
hasequations: false
hascode: false
---
This semester I am taking a course in [High Performance Computing][1] where I get to work with multi-core systems like computing clusters and graphics cards. For my final project I decided to develop a random text generator and see if I could speed it up.

A popular method of generating random text (that is grammatically correct) is using **Markov chains**.<!--more-->

### What is a Markov chain?

A Markov chain is a state machine. The next output depends on the current state. So if you were generating random text, the word to follow would depend on the current word(s). A way to model real speech would be to parse some text and to make a table of prefixes and suffixes. So for example, for the prefix &#8220;how are you&#8221;, the possible suffixes might be &#8220;feeling?&#8221;, &#8220;doing?&#8221;, &#8220;able&#8221; depending on the context.<figure id="attachment_33" style="width: 300px" class="wp-caption aligncenter">

<img class="size-medium wp-image-33" src="/img/wp-content/uploads/2016/04/markov_parsing-300x76.png" alt="Parsing text: prefixes of 2 words and suffix of 1 word." width="300" height="76" srcset="/img/wp-content/uploads/2016/04/markov_parsing-300x76.png 300w, /img/wp-content/uploads/2016/04/markov_parsing-768x195.png 768w, /img/wp-content/uploads/2016/04/markov_parsing-1024x260.png 1024w, /img/wp-content/uploads/2016/04/markov_parsing.png 1381w" sizes="(max-width: 300px) 100vw, 300px" /><figcaption class="wp-caption-text">Parsing text: prefixes of 2 words and suffix of 1 word.</figcaption></figure> <figure id="attachment_34" style="width: 300px" class="wp-caption aligncenter"><img class="size-medium wp-image-34" src="/img/wp-content/uploads/2016/04/markov_table-300x105.png" alt="A table of prefixes and possible suffixes." width="300" height="105" srcset="/img/wp-content/uploads/2016/04/markov_table-300x105.png 300w, /img/wp-content/uploads/2016/04/markov_table-768x269.png 768w, /img/wp-content/uploads/2016/04/markov_table-1024x358.png 1024w, /img/wp-content/uploads/2016/04/markov_table.png 1235w" sizes="(max-width: 300px) 100vw, 300px" /><figcaption class="wp-caption-text">A table of prefixes and possible suffixes.</figcaption></figure>

Once a table is built, you can randomly walk over the table to generate text that more or less follows the syntax of the input text. Let&#8217;s say you were making a Markov chain of order 2 i.e. prefixes of 2 words. First you&#8217;d select a random prefix from the table. That prefix would have a list of possible suffixes. You randomly choose one. Now you have three words printed out: the prefix (2 words) and the suffix (1 word). To find out the next word, you simply create a new prefix consisting of the last word in the previous prefix and your current suffix. So if you chose &#8220;The quick&#8221; as a prefix, and you got &#8220;brown&#8221; as a suffix, the next prefix would be &#8220;quick brown&#8221;. That would yield another word from which you&#8217;d make another prefix and so on.

### Speeding up the process

One way to speed up the process is to use multiple threads to create the chain from a body of text. Each thread parses a certain section of the input, creates a table, and merges it with the universal Markov chain.<figure id="attachment_35" style="width: 660px" class="wp-caption aligncenter">

<img class="wp-image-35 size-large" src="/img/wp-content/uploads/2016/04/markov_parallel-1024x489.png" alt="Parallel Markov chain generation." width="660" height="315" srcset="/img/wp-content/uploads/2016/04/markov_parallel-1024x489.png 1024w, /img/wp-content/uploads/2016/04/markov_parallel-300x143.png 300w, /img/wp-content/uploads/2016/04/markov_parallel-768x367.png 768w, /img/wp-content/uploads/2016/04/markov_parallel.png 1465w" sizes="(max-width: 660px) 100vw, 660px" /><figcaption class="wp-caption-text">Parallel Markov chain generation.</figcaption></figure>

However chain generation is only one part of the process which includes other tasks that happen serially. And given that chain generation takes linear time with respect to the input, I was not expecting a dramatic speed-up by parallelizing code.<figure id="attachment_36" style="width: 300px" class="wp-caption aligncenter">

<img class="wp-image-36 size-medium" src="/img/wp-content/uploads/2016/04/markov_process-300x280.png" alt="markov_process" width="300" height="280" srcset="/img/wp-content/uploads/2016/04/markov_process-300x280.png 300w, /img/wp-content/uploads/2016/04/markov_process.png 753w" sizes="(max-width: 300px) 100vw, 300px" /><figcaption class="wp-caption-text">The whole random text generation process.</figcaption></figure>

I implemented the process in my first ever complete C++ project. I used p_threads for parallel implementation. I could have used multiple processes, but the cost of inter-process communication was too much for O(n) process, I thought. I tested out my code on War and Peace by Leo Tolstoy with different prefix lengths and threads. The speed-ups were decent but not spectacular:<figure id="attachment_37" style="width: 660px" class="wp-caption aligncenter">

<img class="size-large wp-image-37" src="/img/wp-content/uploads/2016/04/markov_speedup-1024x615.png" alt="Speed-up vs. threads for different orders (prefix sizes)." width="660" height="396" srcset="/img/wp-content/uploads/2016/04/markov_speedup-1024x615.png 1024w, /img/wp-content/uploads/2016/04/markov_speedup-300x180.png 300w, /img/wp-content/uploads/2016/04/markov_speedup-768x461.png 768w, /img/wp-content/uploads/2016/04/markov_speedup.png 1242w" sizes="(max-width: 660px) 100vw, 660px" /><figcaption class="wp-caption-text">Speed-up vs. threads for different orders (prefix sizes).</figcaption></figure>

The source code can be found [here.][2]

 [1]: http://sc3260s16.github.io/
 [2]: https://github.com/hazrmard/Markovia
